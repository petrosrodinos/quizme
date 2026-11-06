export interface SearchQuery {
    q: string;
    project_id?: string;
    semantic?: boolean;
}

export interface SearchPassage {
    chunk_id: string;
    document_id: string;
    document_title: string;
    page: number | null;
    section: string | null;
    snippet: string;
    score?: number;
}

export interface SearchResults {
    projects: { id: string; title: string; subject: string | null }[];
    documents: { id: string; project_id: string; filename: string; status: string }[];
    notes: { id: string; project_id: string; title: string | null; content: string; type: string }[];
    flashcards: { id: string; project_id: string; front: string; back: string }[];
    questions: { id: string; project_id: string; prompt: string; type: string; concept: string | null }[];
    topics: { id: string; project_id: string; name: string }[];
    passages: SearchPassage[];
}
