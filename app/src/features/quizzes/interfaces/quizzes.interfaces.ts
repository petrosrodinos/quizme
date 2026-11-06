import type { QuestionType, SourceRef, MatchingPair } from "@/features/questions/interfaces/questions.interfaces";

export const QuizModes = {
    PRACTICE: "PRACTICE",
    ADAPTIVE: "ADAPTIVE",
    REVIEW: "REVIEW",
    EXAM: "EXAM",
    SELECTION: "SELECTION",
    SHARED: "SHARED",
} as const;
export type QuizMode = (typeof QuizModes)[keyof typeof QuizModes];

export const GenerationStatuses = {
    PENDING: "PENDING",
    GENERATING: "GENERATING",
    READY: "READY",
    FAILED: "FAILED",
} as const;
export type GenerationStatus = (typeof GenerationStatuses)[keyof typeof GenerationStatuses];

export const QuizDifficulties = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
    MIXED: "mixed",
    ADAPTIVE: "adaptive",
} as const;
export type QuizDifficulty = (typeof QuizDifficulties)[keyof typeof QuizDifficulties];

export const ReviewSources = {
    ALL_INCORRECT: "all_incorrect",
    ATTEMPT: "attempt",
    TOPIC: "topic",
} as const;
export type ReviewSource = (typeof ReviewSources)[keyof typeof ReviewSources];

export const ReviewStrategies = {
    RETRY: "retry",
    NEW_QUESTIONS: "new_questions",
} as const;
export type ReviewStrategy = (typeof ReviewStrategies)[keyof typeof ReviewStrategies];

export const AttemptStatuses = {
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    ABANDONED: "ABANDONED",
} as const;
export type AttemptStatus = (typeof AttemptStatuses)[keyof typeof AttemptStatuses];

export interface ReviewConfig {
    source: ReviewSource;
    strategy: ReviewStrategy;
    attempt_id?: string;
    topic_id?: string;
}

export interface CreateQuizDto {
    title?: string;
    mode?: QuizMode;
    count?: number;
    types?: QuestionType[];
    difficulty?: QuizDifficulty;
    topic_ids?: string[];
    document_ids?: string[];
    time_limit_min?: number;
    randomize?: boolean;
    use_bank?: boolean;
    target_score?: number;
    review?: ReviewConfig;
    selection_text?: string;
    selection_document_id?: string;
    instructions?: string;
    shared?: boolean;
}

export interface AttemptLite {
    id: string;
    percentage: number;
    status: AttemptStatus;
    started_at: string;
    attempt_number: number;
}

export interface Quiz {
    id: string;
    project_id: string;
    created_by: string;
    title: string;
    mode: QuizMode;
    status: GenerationStatus;
    config: Record<string, unknown>;
    time_limit_sec: number | null;
    target_score: number | null;
    error_message: string | null;
    is_shared: boolean;
    created_at: string;
    updated_at: string;
    question_count?: number;
    attempt_count?: number;
    best_percentage?: number | null;
    last_attempt?: AttemptLite | null;
    in_progress_attempt_id?: string | null;
    attempts?: Attempt[];
    job_id?: string;
}

export interface TopicBreakdown {
    topic_id: string | null;
    topic: string;
    correct: number;
    total: number;
    percentage: number;
}

export interface AttemptAnalysis {
    by_topic: TopicBreakdown[];
    missed_concepts: { concept: string; count: number }[];
    recommendations: string[];
    passed: boolean | null;
    target_score: number | null;
    previous_best: number | null;
    previous_exams: { attempt_id: string; percentage: number; completed_at: string | null }[];
}

export interface Attempt {
    id: string;
    quiz_id: string;
    user_id: string;
    project_id: string;
    attempt_number: number;
    status: AttemptStatus;
    started_at: string;
    completed_at: string | null;
    deadline_at: string | null;
    score: number;
    max_score: number;
    percentage: number;
    correct_count: number;
    incorrect_count: number;
    time_spent_sec: number;
    avg_difficulty: number | null;
    current_combo: number;
    best_combo: number;
    xp_earned: number;
    analysis: AttemptAnalysis | null;
}

/** Client-safe payload per question type (no answers). */
export interface QuestionPayload {
    options?: string[];
    select_count?: number;
    left?: string[];
    right?: string[];
    items?: string[];
    blanks?: number;
}

export interface AnswerValue {
    selected?: number[];
    value?: boolean;
    text?: string;
    pairs?: MatchingPair[];
    order?: string[];
}

export interface Evaluation {
    score: number;
    verdict: "correct" | "partially_correct" | "incorrect";
    expected_answer: string;
    explanation: string;
    mentioned_concepts: string[];
    missing_concepts: string[];
    incorrect_statements: string[];
    suggestions: string[];
    clarity?: number | null;
    completeness?: number;
    accuracy?: number;
}

export interface CorrectAnswer {
    selected?: number[];
    value?: boolean;
    text?: string;
    accepted?: string[];
    pairs?: MatchingPair[];
    order?: string[];
}

export interface AttemptResponse {
    answer: AnswerValue;
    answered: boolean;
    is_correct?: boolean;
    score?: number;
    feedback?: (Partial<Evaluation> & { correct_answer?: CorrectAnswer; skipped?: boolean }) | null;
    correct_answer?: CorrectAnswer | null;
    explanation?: string | null;
}

export interface AttemptQuestion {
    id: string;
    type: QuestionType;
    prompt: string;
    difficulty: number;
    concept: string | null;
    topic_id: string | null;
    source_ref: SourceRef | null;
    payload: QuestionPayload;
    response: AttemptResponse | null;
    explanation?: string | null;
}

export interface AttemptDetail {
    attempt: Attempt;
    quiz: { id: string; title: string; mode: QuizMode; time_limit_sec: number | null; target_score: number | null };
    questions: AttemptQuestion[];
    server_time: string;
}

export interface SubmitAnswerDto {
    question_id: string;
    answer: AnswerValue;
    time_spent_ms?: number;
}

export interface AnswerResult {
    saved?: boolean;
    question_id: string;
    response_id?: string;
    is_correct?: boolean;
    score?: number;
    correct_answer?: CorrectAnswer;
    explanation?: string | null;
    feedback?: Evaluation | null;
    source_ref?: SourceRef | null;
    combo?: number;
    previously_missed?: boolean;
}

export interface AttemptSummary {
    attempt: Attempt;
    quiz: { id: string; title: string; mode: QuizMode; target_score: number | null };
    history: { id: string; attempt_number: number; percentage: number; completed_at: string | null }[];
}

export interface AttemptHistoryRow {
    id: string;
    quiz: { id: string; title: string; mode: QuizMode };
    attempt_number: number;
    started_at: string;
    completed_at: string | null;
    score: number;
    max_score: number;
    percentage: number;
    correct_count: number;
    incorrect_count: number;
    time_spent_sec: number;
    avg_difficulty: number | null;
    best_combo: number;
    missed: { concept: string; count: number }[];
}

export interface AttemptHistoryQuery {
    quiz_id?: string;
    mode?: QuizMode;
    limit?: number;
}

export interface ReviewOverview {
    total_missed: number;
    weak_concepts: { concept: string; misses: number; attempts: number }[];
    by_topic: { topic_id: string | null; topic: string; count: number }[];
    attempts: { id: string; attempt_number: number; incorrect_count: number; completed_at: string | null; quiz: { title: string } }[];
    questions: { id: string; prompt: string; type: QuestionType; concept: string | null; topic_id: string | null; topic: { name: string } | null }[];
}

export interface GroupResults {
    quiz: { id: string; title: string };
    participants: number;
    group_average: number | null;
    leaderboard: { rank: number; user_id: string | null; name: string; is_me: boolean; percentage: number; time_spent_sec: number }[];
    question_difficulty: { question_id: string; prompt: string; percent_correct: number; responses: number }[];
}

export interface DocumentOption {
    id: string;
    filename: string;
    status: string;
}

export interface GenerationStatusEvent {
    kind: string;
    id: string;
    project_id: string;
    status: GenerationStatus;
    error: string | null;
}
