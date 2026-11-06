import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { embedMany, generateObject, generateText, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
    AiProvider,
    AiProviders,
    EmbeddingResult,
    LlmObjectRequest,
    LlmObjectResult,
    LlmTextRequest,
    LlmTextResult,
    ModelTier,
} from '../interfaces/ai.interface';

const DEFAULT_MODELS: Record<'openai' | 'anthropic', Record<ModelTier, string>> = {
    openai: { fast: 'gpt-4.1-mini', smart: 'gpt-4.1' },
    anthropic: { fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5' },
};

export const EMBEDDING_DIMENSIONS = 512;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Provider abstraction over the Vercel AI SDK. Feature code never touches a vendor SDK:
 * it asks for a tier ("fast" / "smart") and receives text, validated structured objects, or embeddings.
 * Swapping providers is configuration (AI_PROVIDER, AI_MODEL_FAST, AI_MODEL_SMART).
 */
@Injectable()
export class LlmProviderService {
    private readonly logger = new Logger(LlmProviderService.name);
    readonly provider: AiProvider;
    readonly embeddingsProvider: 'openai' | 'local';
    private readonly openai?: ReturnType<typeof createOpenAI>;
    private readonly anthropic?: ReturnType<typeof createAnthropic>;
    private readonly models: Record<ModelTier, string>;

    constructor(private readonly config: ConfigService) {
        const openaiKey = config.get<string>('OPENAI_API_KEY');
        const anthropicKey = config.get<string>('ANTHROPIC_API_KEY');
        if (openaiKey) this.openai = createOpenAI({ apiKey: openaiKey });
        if (anthropicKey) this.anthropic = createAnthropic({ apiKey: anthropicKey });

        const requested = (config.get<string>('AI_PROVIDER') || 'auto') as AiProvider | 'auto';
        if (requested === 'openai' && this.openai) this.provider = AiProviders.openai;
        else if (requested === 'anthropic' && this.anthropic) this.provider = AiProviders.anthropic;
        else if (requested === 'local') this.provider = AiProviders.local;
        else this.provider = this.openai ? AiProviders.openai : this.anthropic ? AiProviders.anthropic : AiProviders.local;

        const embeddingsRequested = config.get<string>('EMBEDDINGS_PROVIDER') || 'auto';
        this.embeddingsProvider = embeddingsRequested !== 'local' && this.openai ? 'openai' : 'local';

        const defaults = this.provider === AiProviders.local ? { fast: 'local', smart: 'local' } : DEFAULT_MODELS[this.provider];
        this.models = {
            fast: config.get<string>('AI_MODEL_FAST') || defaults.fast,
            smart: config.get<string>('AI_MODEL_SMART') || defaults.smart,
        };
        this.logger.log(`AI provider: ${this.provider} (fast=${this.models.fast}, smart=${this.models.smart}); embeddings: ${this.embeddingsProvider}`);
    }

    get isLlmAvailable(): boolean {
        return this.provider !== AiProviders.local;
    }

    modelFor(tier: ModelTier): string {
        return this.models[tier];
    }

    get embeddingModelName(): string {
        return this.embeddingsProvider === 'openai' ? `${OPENAI_EMBEDDING_MODEL}@${EMBEDDING_DIMENSIONS}` : `local-hash@${EMBEDDING_DIMENSIONS}`;
    }

    private languageModel(tier: ModelTier): LanguageModel {
        const model = this.models[tier];
        if (this.provider === AiProviders.openai) return this.openai!(model);
        if (this.provider === AiProviders.anthropic) return this.anthropic!(model) as unknown as LanguageModel;
        throw new Error('No LLM provider configured');
    }

    async text(req: LlmTextRequest): Promise<LlmTextResult> {
        const started = Date.now();
        const result = await generateText({
            model: this.languageModel(req.tier),
            system: req.system,
            ...(req.messages ? { messages: req.messages } : { prompt: req.prompt ?? '' }),
            temperature: req.temperature ?? 0.3,
            maxOutputTokens: req.maxTokens ?? 1500,
            maxRetries: 3,
        });
        return {
            text: result.text,
            usage: {
                provider: this.provider,
                model: this.models[req.tier],
                inputTokens: result.usage?.inputTokens ?? 0,
                outputTokens: result.usage?.outputTokens ?? 0,
                latencyMs: Date.now() - started,
            },
        };
    }

    async object<T extends z.ZodTypeAny>(req: LlmObjectRequest<T>): Promise<LlmObjectResult<z.infer<T>>> {
        const started = Date.now();
        const result = await generateObject({
            model: this.languageModel(req.tier),
            system: req.system,
            prompt: req.prompt ?? '',
            schema: req.schema,
            schemaName: req.schemaName,
            temperature: req.temperature ?? 0.4,
            maxOutputTokens: req.maxTokens ?? 4000,
            maxRetries: 3,
        } as any);
        return {
            object: (result as any).object as z.infer<T>,
            usage: {
                provider: this.provider,
                model: this.models[req.tier],
                inputTokens: result.usage?.inputTokens ?? 0,
                outputTokens: result.usage?.outputTokens ?? 0,
                latencyMs: Date.now() - started,
            },
        };
    }

    /** OpenAI embeddings (batched). Callers fall back to local hashed embeddings when unavailable. */
    async embed(texts: string[]): Promise<EmbeddingResult> {
        if (this.embeddingsProvider !== 'openai') throw new Error('Remote embeddings not configured');
        const started = Date.now();
        const vectors: number[][] = [];
        let tokens = 0;
        for (let i = 0; i < texts.length; i += 96) {
            const batch = texts.slice(i, i + 96).map((t) => t.slice(0, 24_000));
            const res = await embedMany({
                model: this.openai!.embeddingModel(OPENAI_EMBEDDING_MODEL),
                values: batch,
                maxRetries: 3,
                providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
            });
            vectors.push(...res.embeddings);
            tokens += res.usage?.tokens ?? 0;
        }
        return {
            vectors,
            model: this.embeddingModelName,
            usage: { provider: 'openai', model: OPENAI_EMBEDDING_MODEL, inputTokens: tokens, outputTokens: 0, latencyMs: Date.now() - started },
        };
    }
}
