/** USD per token (input/output). Used for cost tracking only; unknown models fall back to a default. */
const PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5e-6, output: 10e-6 },
    'gpt-4o-mini': { input: 0.15e-6, output: 0.6e-6 },
    'gpt-4.1': { input: 2e-6, output: 8e-6 },
    'gpt-4.1-mini': { input: 0.4e-6, output: 1.6e-6 },
    'gpt-4.1-nano': { input: 0.1e-6, output: 0.4e-6 },
    'gpt-5': { input: 1.25e-6, output: 10e-6 },
    'gpt-5-mini': { input: 0.25e-6, output: 2e-6 },
    'text-embedding-3-small': { input: 0.02e-6, output: 0 },
    'text-embedding-3-large': { input: 0.13e-6, output: 0 },
    'claude-haiku-5-5': { input: 1e-6, output: 5e-6 },
    'claude-sonnet-5-5': { input: 3e-6, output: 15e-6 },
    local: { input: 0, output: 0 },
};

export const estimateCostUsd = (model: string, inputTokens: number, outputTokens: number): number => {
    const price = PRICING[model] ?? { input: 1e-6, output: 4e-6 };
    return inputTokens * price.input + outputTokens * price.output;
};
