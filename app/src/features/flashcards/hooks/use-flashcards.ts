import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { FlashcardQuery } from "../interfaces/flashcards.interfaces";
import {
    createDeck,
    createFlashcard,
    deleteDeck,
    deleteFlashcard,
    getDecks,
    getFlashcards,
    getFlashcardStats,
    getReviewQueue,
    reviewFlashcard,
    updateDeck,
    updateFlashcard,
} from "../services/flashcards.services";
import { tr } from "@/lib/i18n-options";

export const useDecks = (projectId: string) => useQuery({ queryKey: ["decks", projectId], queryFn: () => getDecks(projectId), enabled: !!projectId });

export const useFlashcards = (projectId: string, query: FlashcardQuery) =>
    useQuery({ queryKey: ["flashcards", projectId, query], queryFn: () => getFlashcards(projectId, query), enabled: !!projectId, placeholderData: (prev) => prev });

export const useFlashcardStats = (projectId: string) =>
    useQuery({ queryKey: ["flashcard-stats", projectId], queryFn: () => getFlashcardStats(projectId), enabled: !!projectId });

/** Review queue is fetched once per session (no background refetch so the deck doesn't reshuffle mid-session). */
export const useReviewQueue = (projectId: string | undefined, params: { limit?: number; deck_id?: string } = {}) =>
    useQuery({
        queryKey: ["flashcard-review", projectId ?? "all", params],
        queryFn: () => getReviewQueue(projectId, params),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        gcTime: 0,
    });

const useInvalidateCards = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["flashcards"] });
        queryClient.invalidateQueries({ queryKey: ["decks"] });
        queryClient.invalidateQueries({ queryKey: ["flashcard-stats"] });
    };
};

export const useCreateDeck = () => {
    const invalidate = useInvalidateCards();
    return useMutation({
        mutationFn: createDeck,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("flashcards:toasts.deckCreated"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.deckCreateFailed"), description: e.message, variant: "error" }),
    });
};

export const useUpdateDeck = () => {
    const invalidate = useInvalidateCards();
    return useMutation({
        mutationFn: updateDeck,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("flashcards:toasts.deckUpdated"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.deckUpdateFailed"), description: e.message, variant: "error" }),
    });
};

export const useDeleteDeck = () => {
    const invalidate = useInvalidateCards();
    return useMutation({
        mutationFn: deleteDeck,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("flashcards:toasts.deckDeleted"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.deckDeleteFailed"), description: e.message, variant: "error" }),
    });
};

export const useCreateFlashcard = () => {
    const invalidate = useInvalidateCards();
    return useMutation({
        mutationFn: createFlashcard,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("flashcards:toasts.cardAdded"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.cardAddFailed"), description: e.message, variant: "error" }),
    });
};

export const useUpdateFlashcard = () => {
    const invalidate = useInvalidateCards();
    return useMutation({
        mutationFn: updateFlashcard,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("flashcards:toasts.cardUpdated"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.cardUpdateFailed"), description: e.message, variant: "error" }),
    });
};

export const useDeleteFlashcard = () => {
    const invalidate = useInvalidateCards();
    return useMutation({
        mutationFn: deleteFlashcard,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("flashcards:toasts.cardDeleted"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.cardDeleteFailed"), description: e.message, variant: "error" }),
    });
};

/** Silent on success (rating feedback is visual); stats are invalidated at the end of the session. */
export const useReviewFlashcard = () =>
    useMutation({
        mutationFn: reviewFlashcard,
        onError: (e: Error) => toast({ title: tr("flashcards:toasts.ratingFailed"), description: e.message, variant: "error" }),
    });
