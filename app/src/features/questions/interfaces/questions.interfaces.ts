export const QuestionTypes = {
    MCQ: "MCQ",
    MULTI_SELECT: "MULTI_SELECT",
    TRUE_FALSE: "TRUE_FALSE",
    FREE_TEXT: "FREE_TEXT",
    FILL_BLANK: "FILL_BLANK",
    MATCHING: "MATCHING",
    ORDERING: "ORDERING",
} as const;
export type QuestionType = (typeof QuestionTypes)[keyof typeof QuestionTypes];

export const ContentOrigins = {
    AI: "AI",
    MANUAL: "MANUAL",
    IMPORTED: "IMPORTED",
} as const;
export type ContentOrigin = (typeof ContentOrigins)[keyof typeof ContentOrigins];

export interface SourceRef {
    chunk_id?: string | null;
    document_id?: string | null;
    document_title?: string | null;
    page?: number | null;
    section?: string | null;
    quote?: string | null;
}

export interface MatchingPair {
    left: string;
    right: string;
}

/** Answer-bearing data per type (editor view only). */
export interface QuestionData {
    options?: string[];
    correct?: number[] | boolean;
    answers?: string[];
    pairs?: MatchingPair[];
    items?: string[];
    expected_answer?: string;
    key_concepts?: string[];
}

export interface QuestionVersion {
    id: string;
    version: number;
    snapshot: { type: QuestionType; prompt: string; data: QuestionData; explanation?: string | null; difficulty: number; tags?: string[] };
    edited_by: string | null;
    created_at: string;
}

export interface Question {
    id: string;
    project_id: string;
    topic_id: string | null;
    document_id: string | null;
    type: QuestionType;
    difficulty: number;
    prompt: string;
    data: QuestionData;
    explanation: string | null;
    concept: string | null;
    source_ref: SourceRef | null;
    tags: string[];
    origin: ContentOrigin;
    generation_model: string | null;
    generated_at: string | null;
    version: number;
    created_at: string;
    updated_at: string;
    topic?: { id: string; name: string } | null;
    total_responses?: number;
    my_stats?: { correct: number; incorrect: number };
    versions?: QuestionVersion[];
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface QuestionListResponse {
    data: Question[];
    pagination: Pagination;
}

export interface QuestionQuery {
    page?: number;
    limit?: number;
    search?: string;
    type?: QuestionType;
    difficulty?: number;
    topic_id?: string;
    tag?: string;
    origin?: ContentOrigin;
    missed?: boolean;
}

export interface CreateQuestionDto {
    type: QuestionType;
    prompt: string;
    data: QuestionData;
    explanation?: string;
    difficulty?: number;
    concept?: string;
    topic_id?: string;
    tags?: string[];
}

export type UpdateQuestionDto = Partial<CreateQuestionDto>;
