/** A retrieved piece of source material handed to the LLM. */
export interface Passage {
    chunkId: string;
    projectId?: string;
    documentId: string;
    documentTitle: string;
    pageStart: number | null;
    pageEnd: number | null;
    section: string | null;
    topicId: string | null;
    content: string;
    score?: number;
}

/** Source reference persisted on generated content and returned as citations. */
export interface SourceRef {
    chunk_id: string;
    document_id: string;
    document_title: string;
    page: number | null;
    section: string | null;
    quote?: string | null;
}

export interface AiCallContext {
    userId?: string | null;
    projectId?: string | null;
    task: string;
}

export const toSourceRef = (p: Passage, quote?: string | null): SourceRef => ({
    chunk_id: p.chunkId,
    document_id: p.documentId,
    document_title: p.documentTitle,
    page: p.pageStart,
    section: p.section,
    quote: quote ?? null,
});

export const TextActions = [
    'explain',
    'simplify',
    'summarize',
    'translate',
    'example',
    'beginner',
    'technical',
    'compare',
    'key_terms',
    'ask',
    'formula',
] as const;
export type TextAction = (typeof TextActions)[number];

export const SummaryLevels = ['ONE_MINUTE', 'FIVE_MINUTE', 'DETAILED', 'CHEAT_SHEET', 'STUDY_GUIDE'] as const;
export type SummaryLevelName = (typeof SummaryLevels)[number];
