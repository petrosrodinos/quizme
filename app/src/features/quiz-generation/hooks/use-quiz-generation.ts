import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createQuickQuiz } from "../services/quiz-generation.services";

/** Starts a selection-based or adaptive quiz; questions are generated in the background. */
export const useCreateQuickQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createQuickQuiz,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: "Quiz is being generated", description: "You'll find it on the Quizzes tab.", duration: 3000 });
        },
        onError: (error: Error) => toast({ title: "Could not create quiz", description: error.message, variant: "error" }),
    });
};
