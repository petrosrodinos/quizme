import type { Pagination } from "@/interfaces/pagination/pagination.interface";

export const CardStatuses = {
    NEW: "NEW",
    LEARNING: "LEARNING",
    KNOWN: "KNOWN",
    NEEDS_REVIEW: "NEEDS_REVIEW",
} as const;
export type CardStatus = (typeof CardStatuses)[keyof typeof CardStatuses];

export const ReviewRatings = {
    AGAIN: "AGAIN",
    HARD: "HARD",
    GOOD: "GOOD",
    EASY: "EASY",
} as const;
export type ReviewRating = (typeof ReviewRatings)[keyof typeof ReviewRatings];

export interface CardState {
    status: CardStatus;
    due_at: string | null;
    interval_days: number;
    ease: number;
    lapses: number;
    repetitions: number;
    last_reviewed_at: string | null;
    last_rating: ReviewRating | null;
}

export interface SourceRef {
    chunk_id: string;
    document_id: string;
    document_title: string;
    page: number | null;
    section: string | null;
    quote?: string | null;
}

export interface Flashcard {
    id: string;
    project_id: string;
    deck_id: string | null;
    topic_id: string | null;
    front: string;
    back: string;
    tags: string[];
    category: string | null;
    difficulty: number;
    origin: "AI" | "MANUAL" | "IMPORTED";
    source_ref: SourceRef | null;
    version: number;
    created_at: string;
    updated_at: string;
    state: CardState;
    topic?: { id: string; name: string } | null;
    deck?: { id: string; name: string } | null;
}

export interface ReviewCard extends Flashcard {
    intervals: Record<ReviewRating, string>;
}

export interface FlashcardCounts {
    due: number;
    new: number;
    learning: number;
    needs_review: number;
    known: number;
    total: number;
}

export interface ReviewQueue {
    cards: ReviewCard[];
    counts: FlashcardCounts;
}

export interface FlashcardStats {
    counts: FlashcardCounts;
    retention: number | null;
    reviews_30d: number;
    forecast: { date: string; count: number }[];
}

export interface Deck {
    id: string;
    project_id: string;
    lesson_id?: string | null;
    name: string;
    description: string | null;
    card_count: number;
    due_count: number;
    created_at: string;
}

export interface FlashcardQuery {
    page?: number;
    limit?: number;
    deck_id?: string;
    topic_id?: string;
    tag?: string;
    status?: CardStatus;
    search?: string;
}

export interface FlashcardList {
    data: Flashcard[];
    pagination: Pagination;
}

export interface FlashcardDto {
    front: string;
    back: string;
    deck_id?: string;
    topic_id?: string;
    tags?: string[];
    category?: string;
    difficulty?: number;
}

export interface DeckDto {
    /** null moves the deck back to Unsorted (update only). */
    lesson_id?: string | null;
    name: string;
    description?: string;
}

export interface ReviewResult {
    card_id: string;
    state: { status: CardStatus; due_at: string; interval_days: number; ease: number; lapses: number };
}
