export const DocumentStatuses = {
    UPLOADED: "UPLOADED",
    PROCESSING: "PROCESSING",
    EXTRACTING: "EXTRACTING",
    CHUNKING: "CHUNKING",
    INDEXING: "INDEXING",
    READY: "READY",
    FAILED: "FAILED",
} as const;
export type DocumentStatus = (typeof DocumentStatuses)[keyof typeof DocumentStatuses];

export const DocumentFileTypes = {
    PDF: "PDF",
    DOCX: "DOCX",
    TXT: "TXT",
    MARKDOWN: "MARKDOWN",
} as const;
export type DocumentFileType = (typeof DocumentFileTypes)[keyof typeof DocumentFileTypes];

export interface OutlineNode {
    title: string;
    level: number;
    page: number | null;
    children: OutlineNode[];
}

export interface StudyDocument {
    id: string;
    project_id: string;
    lesson_id?: string | null;
    uploaded_by: string;
    filename: string;
    mime_type: string;
    file_type: DocumentFileType;
    size_bytes: number;
    status: DocumentStatus;
    progress: number;
    error_message: string | null;
    page_count: number | null;
    word_count: number | null;
    chunk_count: number;
    outline: OutlineNode[] | null;
    processed_at: string | null;
    created_at: string;
    updated_at: string;
    view_url?: string;
}

export interface UploadResult {
    filename: string;
    status: "queued" | "duplicate" | "rejected";
    reason?: string;
    document?: StudyDocument;
}

export interface DocumentChunk {
    id: string;
    chunk_index: number;
    content: string;
    section_path: string[];
    page_start: number | null;
    page_end: number | null;
    topic_id: string | null;
    keywords: string[];
}

export interface DocumentContentPage {
    document: StudyDocument;
    data: DocumentChunk[];
    pagination: { total: number; page: number; limit: number; total_pages: number; has_next: boolean; has_prev: boolean };
}

export interface DocumentStatusEvent {
    id: string;
    project_id: string;
    status: DocumentStatus;
    progress: number;
    error_message: string | null;
    chunk_count: number;
}

export const isProcessing = (status: DocumentStatus) => status !== DocumentStatuses.READY && status !== DocumentStatuses.FAILED;
