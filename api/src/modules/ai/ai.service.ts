import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { LlmProviderService } from '@/integrations/ai/services/llm-provider.service';
import { LlmUsage, ModelTier, ChatTurn } from '@/integrations/ai/interfaces/ai.interface';
import { estimateCostUsd } from '@/integrations/ai/utils/ai-pricing';
import {
    conceptCoverage,
    contentTokens,
    extractKeywords,
    extractiveAnswer,
    hashEmbedding,
    splitSentences,
} from '@/integrations/ai/local/nlp.utils';
import { sha256, stableStringify } from '@/shared/utils/hash.utils';
import * as P from './ai.prompts';
import {
    Evaluation,
    EvaluationSchema,
    FlashcardBatchSchema,
    GeneratedFlashcard,
    GeneratedQuestion,
    QuestionBatchSchema,
    RecallPromptSchema,
    TopicTree,
    TopicTreeSchema,
    TutorAnswerSchema,
    WordLookup,
    WordLookupSchema,
} from './ai.schemas';
import { AiCallContext, Passage, SummaryLevelName, TextAction } from './ai.types';
import { I18nService } from '@/shared/i18n/i18n.service';
import { Lang } from '@/shared/i18n/messages';
import { normalizeLang } from '@/shared/i18n/translate';
import { contentLanguageName, ContentLanguageCode } from '@/shared/i18n/languages';

export interface TutorReply {
    answer: string;
    citedIndices: number[];
    grounded: boolean;
    model: string;
}

/**
 * AI orchestration layer: task-level API used by every feature (questions, flashcards, summaries,
 * tutoring, grading...). Responsibilities: model selection per task, structured outputs, caching,
 * token/cost tracking, per-user generation budgets, and graceful degradation when the provider fails.
 */
@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly dailyTokenLimit: number;
    private readonly queryEmbeddingCache = new Map<string, number[]>();

    constructor(
        private readonly llm: LlmProviderService,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
        config: ConfigService,
    ) {
        this.dailyTokenLimit = Number(config.get('AI_DAILY_TOKEN_LIMIT') ?? 2_000_000);
    }

    /**
     * Language every generated output must be written in: the project's language (set at project creation), or the
     * user's interface language when the call is not tied to a project.
     */
    private async outputLanguage(ctx: AiCallContext): Promise<ContentLanguageCode> {
        return this.i18n.contentLanguageOf(ctx.projectId, ctx.userId);
    }

    /** Catalogue (UI-string) language matching a content language — falls back to English for languages without UI translations. */
    private catalogueLang(code: ContentLanguageCode): Lang {
        return normalizeLang(code);
    }

    private languageInstruction(code: ContentLanguageCode, kind: 'reply' | 'feedback' | 'content'): string {
        const name = contentLanguageName(code);
        if (kind === 'reply') {
            return `

Language: ALWAYS reply in ${name}, the language of this study project — even if the student writes in another language or the sources are in another language. Keep technical terms from the sources where helpful (original wording in parentheses is fine).`;
        }
        if (kind === 'feedback') {
            return `

Language: write every human-readable field (explanation, expected_answer, concepts, statements, suggestions) in ${name}, the language of this study project. Keep JSON keys and enum values (e.g. verdict) exactly as specified.`;
        }
        return `

Language: write ALL human-readable output in ${name}, the language of this study project (question prompts, options, answers, explanations, flashcard text, topic names, summaries, notes). If the source material is in another language, express its concepts in ${name}; keep verbatim quotes (e.g. supporting_quote) in the source's original wording, and keep proper nouns, formulas and standard notation as they are. Keep JSON keys and enum values exactly as specified.`;
    }

    get providerInfo() {
        return {
            provider: this.llm.provider,
            llm_available: this.llm.isLlmAvailable,
            fast_model: this.llm.modelFor('fast'),
            smart_model: this.llm.modelFor('smart'),
            embedding_model: this.llm.embeddingModelName,
        };
    }

    get embeddingModel(): string {
        return this.llm.embeddingModelName;
    }

    // ── Infrastructure ────────────────────────────────────────

    private requireLlm() {
        if (!this.llm.isLlmAvailable) {
            throw new ServiceUnavailableException('AI generation is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
        }
    }

    /** Enforces the per-user daily token budget (cost control). */
    async assertBudget(userId?: string | null) {
        if (!userId) return;
        const since = new Date(Date.now() - 24 * 3600_000);
        const agg = await this.prisma.aiUsage.aggregate({
            where: { user_id: userId, created_at: { gte: since } },
            _sum: { input_tokens: true, output_tokens: true },
        });
        const used = (agg._sum.input_tokens ?? 0) + (agg._sum.output_tokens ?? 0);
        if (used >= this.dailyTokenLimit) {
            throw new HttpException('Daily AI generation limit reached. Please try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    private async track(ctx: AiCallContext, usage: LlmUsage | null, cached: boolean, success = true) {
        try {
            await this.prisma.aiUsage.create({
                data: {
                    user_id: ctx.userId ?? null,
                    project_id: ctx.projectId ?? null,
                    task: ctx.task,
                    provider: usage?.provider ?? this.llm.provider,
                    model: usage?.model ?? 'cache',
                    input_tokens: usage?.inputTokens ?? 0,
                    output_tokens: usage?.outputTokens ?? 0,
                    cost_usd: usage ? estimateCostUsd(usage.model, usage.inputTokens, usage.outputTokens) : 0,
                    latency_ms: usage?.latencyMs ?? 0,
                    cached,
                    success,
                },
            });
        } catch (error) {
            this.logger.warn(`Failed to record AI usage: ${error?.message}`);
        }
    }

    private async cached<T>(key: string, task: string, ttlDays: number | null, produce: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
        const hit = await this.prisma.aiCache.findUnique({ where: { key } });
        if (hit && (!hit.expires_at || hit.expires_at > new Date())) {
            void this.prisma.aiCache.update({ where: { key }, data: { hits: { increment: 1 } } }).catch(() => undefined);
            return { value: hit.response as T, hit: true };
        }
        const value = await produce();
        await this.prisma.aiCache
            .upsert({
                where: { key },
                create: { key, task, response: value as Prisma.InputJsonValue, expires_at: ttlDays ? new Date(Date.now() + ttlDays * 86_400_000) : null },
                update: { response: value as Prisma.InputJsonValue, created_at: new Date(), expires_at: ttlDays ? new Date(Date.now() + ttlDays * 86_400_000) : null },
            })
            .catch(() => undefined);
        return { value, hit: false };
    }

    private async object<T extends z.ZodTypeAny>(
        ctx: AiCallContext,
        tier: ModelTier,
        system: string,
        prompt: string,
        schema: T,
        opts: { temperature?: number; maxTokens?: number } = {},
    ): Promise<z.infer<T>> {
        this.requireLlm();
        try {
            const res = await this.llm.object({ tier, system, prompt, schema, temperature: opts.temperature, maxTokens: opts.maxTokens });
            await this.track(ctx, res.usage, false);
            return res.object;
        } catch (error) {
            await this.track(ctx, null, false, false);
            this.logger.error(`AI task ${ctx.task} failed: ${error?.message}`);
            throw new ServiceUnavailableException('The AI provider is temporarily unavailable. Please retry.');
        }
    }

    private async text(ctx: AiCallContext, tier: ModelTier, system: string, input: { prompt?: string; messages?: ChatTurn[] }, maxTokens = 1500, temperature = 0.3) {
        this.requireLlm();
        try {
            const res = await this.llm.text({ tier, system, ...input, maxTokens, temperature });
            await this.track(ctx, res.usage, false);
            return res;
        } catch (error) {
            await this.track(ctx, null, false, false);
            this.logger.error(`AI task ${ctx.task} failed: ${error?.message}`);
            throw new ServiceUnavailableException('The AI provider is temporarily unavailable. Please retry.');
        }
    }

    // ── Embeddings ────────────────────────────────────────────

    /** Embeds texts with the configured provider, falling back to local hashed embeddings. */
    async embed(texts: string[], ctx: AiCallContext): Promise<{ vectors: number[][]; model: string }> {
        if (!texts.length) return { vectors: [], model: this.embeddingModel };
        if (this.llm.embeddingsProvider === 'openai') {
            const res = await this.llm.embed(texts);
            await this.track({ ...ctx, task: 'embeddings' }, res.usage, false);
            return { vectors: res.vectors, model: res.model };
        }
        return { vectors: texts.map((t) => hashEmbedding(t)), model: this.embeddingModel };
    }

    async embedQuery(text: string, ctx: AiCallContext): Promise<number[]> {
        const key = sha256(`${this.embeddingModel}:${text.trim().toLowerCase()}`);
        const hit = this.queryEmbeddingCache.get(key);
        if (hit) return hit;
        let vector: number[];
        try {
            vector = (await this.embed([text], { ...ctx, task: 'query_embedding' })).vectors[0];
        } catch (error) {
            this.logger.warn(`Query embedding failed, using local fallback: ${error?.message}`);
            vector = hashEmbedding(text);
        }
        if (this.queryEmbeddingCache.size > 2000) this.queryEmbeddingCache.clear();
        this.queryEmbeddingCache.set(key, vector);
        return vector;
    }

    // ── Generation tasks ──────────────────────────────────────

    async generateQuestions(
        ctx: AiCallContext,
        opts: { passages: Passage[]; count: number; types: string[]; difficulty: string; focusConcepts?: string[]; avoid?: string[]; instructions?: string },
    ): Promise<GeneratedQuestion[]> {
        await this.assertBudget(ctx.userId);
        const system = `${P.QUESTION_SYSTEM}${this.languageInstruction(await this.outputLanguage(ctx), 'content')}`;
        const res = await this.object(ctx, 'fast', system, P.questionPrompt(opts), QuestionBatchSchema, {
            temperature: 0.6,
            maxTokens: Math.min(16_000, 900 * opts.count + 800),
        });
        return res.questions;
    }

    async generateFlashcards(ctx: AiCallContext, passages: Passage[], count: number, instructions?: string): Promise<GeneratedFlashcard[]> {
        await this.assertBudget(ctx.userId);
        const system = `${P.FLASHCARD_SYSTEM}${this.languageInstruction(await this.outputLanguage(ctx), 'content')}`;
        const res = await this.object(ctx, 'fast', system, P.flashcardPrompt(passages, count, instructions), FlashcardBatchSchema, {
            temperature: 0.4,
            maxTokens: Math.min(12_000, 220 * count + 600),
        });
        return res.cards;
    }

    async buildTopicTree(ctx: AiCallContext, projectTitle: string, sections: { title: string; text: string }[]): Promise<TopicTree | null> {
        if (!this.llm.isLlmAvailable) return null;
        try {
            const system = `${P.TOPIC_SYSTEM}${this.languageInstruction(await this.outputLanguage(ctx), 'content')}`;
            return await this.object(ctx, 'fast', system, P.topicPrompt(projectTitle, sections), TopicTreeSchema, { temperature: 0.2, maxTokens: 6000 });
        } catch {
            return null;
        }
    }

    /** Hierarchical (map/reduce) summarization so arbitrarily large material never hits the context limit. */
    async summarize(ctx: AiCallContext, level: SummaryLevelName, title: string, passages: Passage[]): Promise<{ content: string; model: string }> {
        await this.assertBudget(ctx.userId);
        const SUMMARY_SYSTEM = `${P.SUMMARY_SYSTEM}${this.languageInstruction(await this.outputLanguage(ctx), 'content')}`;
        const totalChars = passages.reduce((s, p) => s + p.content.length, 0);
        const reduceTier: ModelTier = level === 'ONE_MINUTE' ? 'fast' : 'smart';
        const maxTokens = level === 'DETAILED' || level === 'STUDY_GUIDE' ? 6000 : level === 'ONE_MINUTE' ? 600 : 3000;
        if (totalChars <= 40_000) {
            const res = await this.text(ctx, reduceTier, SUMMARY_SYSTEM, { prompt: P.summaryDirectPrompt(level, title, passages) }, maxTokens);
            return { content: res.text, model: res.usage.model };
        }
        const groups: Passage[][] = [];
        let current: Passage[] = [];
        let size = 0;
        for (const p of passages) {
            if (size + p.content.length > 24_000 && current.length) {
                groups.push(current);
                current = [];
                size = 0;
            }
            current.push(p);
            size += p.content.length;
        }
        if (current.length) groups.push(current);
        const notes: string[] = [];
        for (let i = 0; i < groups.length; i += 4) {
            const batch = groups.slice(i, i + 4);
            const results = await Promise.all(
                batch.map((g) => this.text({ ...ctx, task: `${ctx.task}:map` }, 'fast', SUMMARY_SYSTEM, { prompt: P.summaryMapPrompt(g) }, 1800)),
            );
            notes.push(...results.map((r) => r.text));
        }
        let merged = notes.join('\n\n---\n\n');
        if (merged.length > 60_000) {
            const res = await this.text({ ...ctx, task: `${ctx.task}:compress` }, 'fast', SUMMARY_SYSTEM, {
                prompt: `Condense these notes, preserving every key concept, definition and formula:\n${merged.slice(0, 120_000)}`,
            }, 6000);
            merged = res.text;
        }
        const res = await this.text(ctx, reduceTier, SUMMARY_SYSTEM, { prompt: P.summaryReducePrompt(level, title, merged) }, maxTokens);
        return { content: res.text, model: res.usage.model };
    }

    async tutorReply(ctx: AiCallContext, mode: 'TUTOR' | 'SOCRATIC', passages: Passage[], history: ChatTurn[], question: string): Promise<TutorReply> {
        const code = await this.outputLanguage(ctx);
        if (!this.llm.isLlmAvailable) return this.localTutorReply(question, passages, this.catalogueLang(code));
        await this.assertBudget(ctx.userId);
        const langRule = this.languageInstruction(code, 'reply');
        const sources = passages.length ? `Source passages:\n${P.formatPassages(passages, 1800)}` : 'Source passages: (none found for this question)';
        if (mode === 'SOCRATIC') {
            const res = await this.text(
                ctx,
                'smart',
                `${P.SOCRATIC_SYSTEM}${langRule}\n\n${sources}`,
                { messages: [...history.slice(-12), { role: 'user', content: question }] },
                700,
                0.5,
            );
            const cited = [...res.text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
            return { answer: res.text, citedIndices: [...new Set(cited)], grounded: passages.length > 0, model: res.usage.model };
        }
        const convo = history
            .slice(-10)
            .map((t) => `${t.role === 'user' ? 'Student' : 'Tutor'}: ${t.content.slice(0, 1500)}`)
            .join('\n');
        const res = await this.object(
            ctx,
            'smart',
            `${P.TUTOR_SYSTEM}${langRule}`,
            `${sources}\n\n${convo ? `Conversation so far:\n${convo}\n\n` : ''}Student: ${question}`,
            TutorAnswerSchema,
            { temperature: 0.3, maxTokens: 2500 },
        );
        return { answer: res.answer, citedIndices: res.cited_sources, grounded: res.grounded, model: this.llm.modelFor('smart') };
    }

    private localTutorReply(question: string, passages: Passage[], lang: Lang): TutorReply {
        const sentences = extractiveAnswer(question, passages.map((p) => p.content));
        if (!sentences.length) {
            return { answer: this.i18n.t(lang, 'tutor.noSources'), citedIndices: [], grounded: false, model: 'local' };
        }
        const cited: number[] = [];
        const lines = sentences.map((s) => {
            const idx = passages.findIndex((p) => p.content.includes(s.slice(0, 40)));
            if (idx >= 0) cited.push(idx + 1);
            return `- ${s}${idx >= 0 ? ` [${idx + 1}]` : ''}`;
        });
        return { answer: `${this.i18n.t(lang, 'tutor.extractiveIntro')}\n\n${lines.join('\n')}`, citedIndices: [...new Set(cited)], grounded: true, model: 'local' };
    }

    /** Grades free-text / recall / teach-back answers against the source material. */
    async evaluateAnswer(
        ctx: AiCallContext,
        opts: { prompt: string; reference?: string | null; keyConcepts?: string[]; answer: string; passages: Passage[]; mode: 'FREE_TEXT' | 'ACTIVE_RECALL' | 'TEACH_BACK' },
    ): Promise<Evaluation> {
        if (!opts.answer.trim()) return this.localEvaluation(opts);
        if (!this.llm.isLlmAvailable) return this.localEvaluation(opts);
        try {
            await this.assertBudget(ctx.userId);
            const code = await this.outputLanguage(ctx);
            return await this.object(ctx, 'fast', `${P.EVALUATION_SYSTEM}${this.languageInstruction(code, 'feedback')}`, P.evaluationPrompt(opts), EvaluationSchema, { temperature: 0.1, maxTokens: 1500 });
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) throw error;
            this.logger.warn(`Falling back to local evaluation: ${error?.message}`);
            return this.localEvaluation(opts);
        }
    }

    private localEvaluation(opts: { reference?: string | null; keyConcepts?: string[]; answer: string; passages: Passage[]; mode: string }): Evaluation {
        const reference = opts.reference || opts.passages.map((p) => p.content).join(' ').slice(0, 2000);
        const concepts = opts.keyConcepts?.length ? opts.keyConcepts : extractKeywords(reference, 6);
        const cov = conceptCoverage(concepts, opts.answer);
        const lengthFactor = Math.min(1, contentTokens(opts.answer).length / 12);
        const score = Math.round(100 * (0.8 * cov.ratio + 0.2 * lengthFactor));
        return {
            score,
            verdict: score >= 80 ? 'correct' : score >= 40 ? 'partially_correct' : 'incorrect',
            expected_answer: reference.slice(0, 600),
            explanation: 'Graded automatically by comparing the key concepts in your answer with the source material.',
            mentioned_concepts: cov.present,
            missing_concepts: cov.missing,
            incorrect_statements: [],
            suggestions: cov.missing.length ? [`Try to cover: ${cov.missing.slice(0, 3).join(', ')}.`] : ['Great coverage of the key concepts.'],
            clarity: opts.mode === 'TEACH_BACK' ? Math.min(100, 40 + splitSentences(opts.answer).length * 10) : null,
            completeness: Math.round(cov.ratio * 100),
            accuracy: score,
        };
    }

    async textAction(ctx: AiCallContext, action: TextAction, text: string, passages: Passage[], extra: Record<string, string | undefined> = {}) {
        if (!this.llm.isLlmAvailable) {
            const sentences = extractiveAnswer(text, passages.map((p) => p.content), 5);
            return { content: sentences.length ? sentences.map((s) => `- ${s}`).join('\n') : 'AI provider not configured.', model: 'local', cached: false };
        }
        await this.assertBudget(ctx.userId);
        const lang = await this.outputLanguage(ctx);
        const key = sha256(stableStringify({ t: 'text_action', action, text: text.trim(), extra, lang, m: this.llm.modelFor('fast') }));
        // "translate" targets the requested language; every other action answers in the project language.
        const system = action === 'translate' ? P.TEXT_ACTION_SYSTEM : `${P.TEXT_ACTION_SYSTEM}${this.languageInstruction(lang, 'content')}`;
        const { value, hit } = await this.cached(key, 'text_action', 30, async () => {
            const res = await this.text(ctx, 'fast', system, { prompt: P.textActionPrompt(action, text, passages, extra) }, 1500);
            return { content: res.text, model: res.usage.model };
        });
        if (hit) await this.track(ctx, null, true);
        return { ...value, cached: hit };
    }

    async wordLookup(ctx: AiCallContext, word: string, context: string, language?: string): Promise<WordLookup & { cached: boolean }> {
        this.requireLlm();
        await this.assertBudget(ctx.userId);
        const lang = await this.outputLanguage(ctx);
        const key = sha256(stableStringify({ t: 'word', word: word.toLowerCase().trim(), context: context.trim().slice(0, 300), language: language || null, lang }));
        const { value, hit } = await this.cached(key, 'word_lookup', 90, () =>
            this.object(ctx, 'fast', `${P.WORD_SYSTEM}${this.languageInstruction(lang, 'content')} The "word" field stays as given.`, P.wordPrompt(word, context, language), WordLookupSchema, { temperature: 0.1, maxTokens: 600 }),
        );
        if (hit) await this.track(ctx, null, true);
        return { ...(value as WordLookup), cached: hit };
    }

    async recallPrompts(ctx: AiCallContext, passages: Passage[], count: number, mode: 'ACTIVE_RECALL' | 'TEACH_BACK') {
        await this.assertBudget(ctx.userId);
        const system = `${P.RECALL_SYSTEM}${this.languageInstruction(await this.outputLanguage(ctx), 'content')}`;
        const res = await this.object(ctx, 'fast', system, P.recallPrompt(passages, count, mode), RecallPromptSchema, { temperature: 0.5, maxTokens: 2500 });
        return res.prompts;
    }
}
