import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { completeDailySession, getDailySession } from "../services/study.services";
import { createQuiz } from "@/features/quizzes/services/quizzes.services";
import type { CreateQuizDto } from "@/features/quizzes/interfaces/quizzes.interfaces";

export const useDailySession = (projectId?: string) =>
    useQuery({ queryKey: ["study-session", projectId ?? "all"], queryFn: () => getDailySession(projectId), staleTime: 30_000 });

export const useCompleteDailySession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: completeDailySession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["study-session"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
            toast({ title: "Session complete", description: "Great work, the daily session is done.", duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Not quite yet", description: error.message, variant: "error" }),
    });
};

/** Starts the quiz behind a session block (adaptive / weak-topic review); generation runs in the background. */
export const useStartSessionQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, dto }: { projectId: string; dto: CreateQuizDto }) => createQuiz(projectId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: "Preparing your questions", description: "Hang tight, this takes a few seconds.", duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not start the quiz", description: error.message, variant: "error" }),
    });
};
