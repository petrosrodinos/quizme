import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { generateFlashcards } from "../services/flashcard-generation.services";

export const useGenerateFlashcards = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: generateFlashcards,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["flashcards"] });
            toast({ title: "Generating flashcards", description: "They'll appear in your deck in a moment.", duration: 3000 });
        },
        onError: (error: Error) => toast({ title: "Could not generate flashcards", description: error.message, variant: "error" }),
    });
};
