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
import { tr } from "@/lib/i18n-options";

export const getDecks = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Deck[]>(ApiRoutes.flashcards.decks(projectId))).data, tr("flashcards:errors.loadDecks"));

export const createDeck = ({ projectId, dto }: { projectId: string; dto: DeckDto }) =>
    withApiError(async () => (await axiosInstance.post<Deck>(ApiRoutes.flashcards.decks(projectId), dto)).data, tr("flashcards:errors.createDeck"));

export const updateDeck = ({ id, dto }: { id: string; dto: Partial<DeckDto> }) =>
    withApiError(async () => (await axiosInstance.patch<Deck>(ApiRoutes.flashcards.deck(id), dto)).data, tr("flashcards:errors.updateDeck"));

export const deleteDeck = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.flashcards.deck(id))).data, tr("flashcards:errors.deleteDeck"));

export const getFlashcards = (projectId: string, query: FlashcardQuery) =>
    withApiError(async () => (await axiosInstance.get<FlashcardList>(ApiRoutes.flashcards.by_project(projectId), { params: query })).data, tr("flashcards:errors.loadCards"));

export const createFlashcard = ({ projectId, dto }: { projectId: string; dto: FlashcardDto }) =>
    withApiError(async () => (await axiosInstance.post<Flashcard>(ApiRoutes.flashcards.by_project(projectId), dto)).data, tr("flashcards:errors.createCard"));

export const updateFlashcard = ({ id, dto }: { id: string; dto: Partial<FlashcardDto> }) =>
    withApiError(async () => (await axiosInstance.patch<Flashcard>(ApiRoutes.flashcards.detail(id), dto)).data, tr("flashcards:errors.updateCard"));

export const deleteFlashcard = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.flashcards.detail(id))).data, tr("flashcards:errors.deleteCard"));

export const getFlashcardStats = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<FlashcardStats>(ApiRoutes.flashcards.stats(projectId))).data, tr("flashcards:errors.loadStats"));

export const getReviewQueue = (projectId: string | undefined, params: { limit?: number; deck_id?: string }) =>
    withApiError(
        async () =>
            (await axiosInstance.get<ReviewQueue>(projectId ? ApiRoutes.flashcards.review_queue(projectId) : ApiRoutes.flashcards.global_review_queue, { params })).data,
        tr("flashcards:errors.loadReview"),
    );

export const reviewFlashcard = ({ id, rating, time_spent_ms }: { id: string; rating: ReviewRating; time_spent_ms: number }) =>
    withApiError(async () => (await axiosInstance.post<ReviewResult>(ApiRoutes.flashcards.review(id), { rating, time_spent_ms })).data, tr("flashcards:errors.saveRating"));
