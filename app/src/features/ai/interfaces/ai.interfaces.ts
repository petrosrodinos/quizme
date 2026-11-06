export interface AiStatus {
    provider: string;
    llm_available: boolean;
    fast_model: string;
    smart_model: string;
    embedding_model: string;
}

export interface AiUsage {
    last_24h_tokens: number;
    by_task: { task: string; calls: number; tokens: number; cost_usd: number }[];
}
