import type { SourceRef } from "@/features/flashcards/interfaces/flashcards.interfaces";

export const RecallModes = {
    ACTIVE_RECALL: "ACTIVE_RECALL",
    TEACH_BACK: "TEACH_BACK",
} as const;
export type RecallMode = (typeof RecallModes)[keyof typeof RecallModes];

export type RecallVerdict = "correct" | "partially_correct" | "incorrect";

export interface RecallPrompt {
    prompt_id: string;
    prompt: string;
    topic_id: string | null;
    source: SourceRef | null;
}

export interface Evaluation {
    score: number;
    verdict: RecallVerdict;
    expected_answer: string;
    explanation: string;
    mentioned_concepts: string[];
    missing_concepts: string[];
    incorrect_statements: string[];
    suggestions: string[];
    clarity: number | null;
    completeness: number;
    accuracy: number;
}

export interface EvaluateRecallDto {
    mode: RecallMode;
    prompt_id?: string;
    prompt?: string;
    answer: string;
    topic_id?: string;
    time_spent_sec?: number;
}

export interface RecallResult {
    id: string;
    prompt: string;
    evaluation: Evaluation;
    sources: SourceRef[];
}

export interface RecallAttempt {
    id: string;
    mode: RecallMode;
    prompt: string;
    answer: string;
    evaluation: Evaluation;
    score: number;
    topic_id: string | null;
    created_at: string;
}
