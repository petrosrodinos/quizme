export interface TopicNode {
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    keywords: string[];
    mastery: number;
    attempts: number;
    mastered: boolean;
    counts: { chunks: number; questions: number; flashcards: number };
    children: TopicNode[];
}

export interface CreateTopicDto {
    name: string;
    description?: string;
    parent_id?: string;
}

export interface UpdateTopicDto {
    name?: string;
    description?: string;
}

export interface FlatTopic {
    id: string;
    name: string;
    depth: number;
}
