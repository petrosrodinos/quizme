import { z } from 'zod';

export const AiProviders = {
    openai: 'openai',
    anthropic: 'anthropic',
    local: 'local',
} as const;
export type AiProvider = (typeof AiProviders)[keyof typeof AiProviders];

/** Model tier per task: cheap/fast for bulk structured generation, smart for reasoning-heavy work. */
export const ModelTiers = {
    fast: 'fast',
    smart: 'smart',
} as const;
export type ModelTier = (typeof ModelTiers)[keyof typeof ModelTiers];

export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

export interface LlmTextRequest {
    tier: ModelTier;
    system: string;
    prompt?: string;
    messages?: ChatTurn[];
    temperature?: number;
    maxTokens?: number;
}

export interface LlmObjectRequest<T extends z.ZodTypeAny> extends LlmTextRequest {
    schema: T;
    schemaName?: string;
}

export interface LlmUsage {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
}

export interface LlmTextResult {
    text: string;
    usage: LlmUsage;
}

export interface LlmObjectResult<T> {
    object: T;
    usage: LlmUsage;
}

export interface EmbeddingResult {
    vectors: number[][];
    model: string;
    usage: LlmUsage;
}
