import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { generateFlashcards } from "../services/flashcard-generation.services";
import { tr } from "@/lib/i18n-options";

export const useGenerateFlashcards = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: generateFlashcards,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["flashcards"] });
            toast({ title: tr("reader:toasts.flashcardsGenerating.title"), description: tr("reader:toasts.flashcardsGenerating.description"), duration: 3000 });
        },
        onError: (error: Error) => toast({ title: tr("reader:toasts.flashcardsFailed"), description: error.message, variant: "error" }),
    });
};
