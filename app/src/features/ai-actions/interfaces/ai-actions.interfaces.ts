export const TextActions = {
    EXPLAIN: "explain",
    SIMPLIFY: "simplify",
    SUMMARIZE: "summarize",
    TRANSLATE: "translate",
    EXAMPLE: "example",
    BEGINNER: "beginner",
    TECHNICAL: "technical",
    COMPARE: "compare",
    KEY_TERMS: "key_terms",
    ASK: "ask",
    FORMULA: "formula",
} as const;
export type TextAction = (typeof TextActions)[keyof typeof TextActions];

export interface TextActionDto {
    action: TextAction;
    text: string;
    document_id?: string;
    language?: string;
    compare_with?: string;
    question?: string;
}

export interface TextActionResult {
    content: string;
    model: string;
    cached: boolean;
}

export interface WordLookupDto {
    word: string;
    context: string;
    language?: string;
}

export interface WordLookupResult {
    word: string;
    definition: string;
    contextual_meaning: string;
    pronunciation: string | null;
    part_of_speech: string | null;
    translation: string | null;
    example: string;
    related_terms: string[];
    cached: boolean;
}
