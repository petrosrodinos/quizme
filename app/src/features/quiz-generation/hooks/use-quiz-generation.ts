import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createQuickQuiz } from "../services/quiz-generation.services";
import { tr } from "@/lib/i18n-options";

/** Starts a selection-based or adaptive quiz; questions are generated in the background. */
export const useCreateQuickQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createQuickQuiz,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: tr("reader:toasts.quizGenerating.title"), description: tr("reader:toasts.quizGenerating.description"), duration: 3000 });
        },
        onError: (error: Error) => toast({ title: tr("reader:toasts.quizFailed"), description: error.message, variant: "error" }),
    });
};
