export const ChatModes = {
    TUTOR: "TUTOR",
    SOCRATIC: "SOCRATIC",
} as const;
export type ChatMode = (typeof ChatModes)[keyof typeof ChatModes];

export interface ChatThread {
    id: string;
    project_id: string;
    title: string;
    mode: ChatMode;
    created_at: string;
    updated_at: string;
    _count?: { messages: number };
}

export interface Citation {
    index: number;
    chunk_id: string;
    document_id: string;
    document_title: string;
    page: number | null;
    section: string | null;
    quote?: string | null;
}

export interface ChatMessage {
    id: string;
    thread_id: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    citations: Citation[] | null;
    grounded: boolean;
    model: string | null;
    created_at: string;
}

export interface ThreadMessages {
    thread: ChatThread;
    messages: ChatMessage[];
}

export interface SendMessageDto {
    content: string;
    document_id?: string;
    topic_id?: string;
}

export interface SendMessageResult {
    user_message: ChatMessage;
    assistant_message: ChatMessage;
}
