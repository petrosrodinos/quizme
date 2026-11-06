import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { completeDailySession, getDailySession } from "../services/study.services";
import { createQuiz } from "@/features/quizzes/services/quizzes.services";
import type { CreateQuizDto } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { tr } from "@/lib/i18n-options";

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
            toast({ title: tr("study:toasts.complete.title"), description: tr("study:toasts.complete.description"), duration: 2500 });
        },
        onError: (error: Error) => toast({ title: tr("study:toasts.notYet"), description: error.message, variant: "error" }),
    });
};

/** Starts the quiz behind a session block (adaptive / weak-topic review); generation runs in the background. */
export const useStartSessionQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, dto }: { projectId: string; dto: CreateQuizDto }) => createQuiz(projectId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: tr("study:toasts.preparing.title"), description: tr("study:toasts.preparing.description"), duration: 2500 });
        },
        onError: (error: Error) => toast({ title: tr("study:toasts.quizFailed"), description: error.message, variant: "error" }),
    });
};
