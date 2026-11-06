export const NoteTypes = {
    NOTE: "NOTE",
    HIGHLIGHT: "HIGHLIGHT",
    ANNOTATION: "ANNOTATION",
    BOOKMARK: "BOOKMARK",
    QUESTION: "QUESTION",
} as const;
export type NoteType = (typeof NoteTypes)[keyof typeof NoteTypes];

export interface Note {
    id: string;
    project_id: string;
    user_id: string;
    type: NoteType;
    title: string | null;
    content: string;
    document_id: string | null;
    page: number | null;
    chunk_id: string | null;
    selection_text: string | null;
    topic_id: string | null;
    color: string | null;
    tags: string[];
    is_shared: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateNoteDto {
    type: NoteType;
    title?: string;
    content: string;
    document_id?: string;
    page?: number;
    chunk_id?: string;
    selection_text?: string;
    color?: string;
    tags?: string[];
    topic_id?: string;
    is_shared?: boolean;
}

export type NoteScope = "mine" | "shared" | "all";

export interface NotesQuery {
    document_id?: string;
    type?: NoteType;
    topic_id?: string;
    search?: string;
    scope?: NoteScope;
}

/** Note as returned by the project notes list (with author/document/topic relations). */
export interface NoteWithRelations extends Note {
    user?: { id: string; full_name: string | null; email: string } | null;
    document?: { id: string; filename: string } | null;
    topic?: { id: string; name: string } | null;
}

export interface UpdateNoteDto {
    type?: NoteType;
    title?: string;
    content?: string;
    color?: string;
    tags?: string[];
    is_shared?: boolean;
    topic_id?: string;
}

export type NoteTransformTarget = "flashcards" | "quiz" | "summary" | "study_guide";

export type NoteTransformResult = { kind: "flashcards"; job_id: string } | { kind: "quiz"; quiz_id: string } | { kind: "note"; note: Note };
