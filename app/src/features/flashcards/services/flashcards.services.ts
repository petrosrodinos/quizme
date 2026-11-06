import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type {
    Deck,
    DeckDto,
    Flashcard,
    FlashcardDto,
    FlashcardList,
    FlashcardQuery,
    FlashcardStats,
    ReviewQueue,
    ReviewRating,
    ReviewResult,
} from "../interfaces/flashcards.interfaces";

export const getDecks = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Deck[]>(ApiRoutes.flashcards.decks(projectId))).data, "Failed to load decks.");

export const createDeck = ({ projectId, dto }: { projectId: string; dto: DeckDto }) =>
    withApiError(async () => (await axiosInstance.post<Deck>(ApiRoutes.flashcards.decks(projectId), dto)).data, "Failed to create deck.");

export const updateDeck = ({ id, dto }: { id: string; dto: Partial<DeckDto> }) =>
    withApiError(async () => (await axiosInstance.patch<Deck>(ApiRoutes.flashcards.deck(id), dto)).data, "Failed to update deck.");

export const deleteDeck = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.flashcards.deck(id))).data, "Failed to delete deck.");

export const getFlashcards = (projectId: string, query: FlashcardQuery) =>
    withApiError(async () => (await axiosInstance.get<FlashcardList>(ApiRoutes.flashcards.by_project(projectId), { params: query })).data, "Failed to load flashcards.");

export const createFlashcard = ({ projectId, dto }: { projectId: string; dto: FlashcardDto }) =>
    withApiError(async () => (await axiosInstance.post<Flashcard>(ApiRoutes.flashcards.by_project(projectId), dto)).data, "Failed to create flashcard.");

export const updateFlashcard = ({ id, dto }: { id: string; dto: Partial<FlashcardDto> }) =>
    withApiError(async () => (await axiosInstance.patch<Flashcard>(ApiRoutes.flashcards.detail(id), dto)).data, "Failed to update flashcard.");

export const deleteFlashcard = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.flashcards.detail(id))).data, "Failed to delete flashcard.");

export const getFlashcardStats = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<FlashcardStats>(ApiRoutes.flashcards.stats(projectId))).data, "Failed to load flashcard stats.");

export const getReviewQueue = (projectId: string | undefined, params: { limit?: number; deck_id?: string }) =>
    withApiError(
        async () =>
            (await axiosInstance.get<ReviewQueue>(projectId ? ApiRoutes.flashcards.review_queue(projectId) : ApiRoutes.flashcards.global_review_queue, { params })).data,
        "Failed to load your review session.",
    );

export const reviewFlashcard = ({ id, rating, time_spent_ms }: { id: string; rating: ReviewRating; time_spent_ms: number }) =>
    withApiError(async () => (await axiosInstance.post<ReviewResult>(ApiRoutes.flashcards.review(id), { rating, time_spent_ms })).data, "Failed to save your rating.");
