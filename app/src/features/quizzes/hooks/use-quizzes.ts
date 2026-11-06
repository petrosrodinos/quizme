import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
    completeAttempt,
    createQuiz,
    deleteQuiz,
    getAttempt,
    getAttemptHistory,
    getAttemptSummary,
    getProjectDocumentOptions,
    getQuiz,
    getQuizResults,
    getQuizzes,
    getReviewOverview,
    shareQuiz,
    startAttempt,
    submitAnswer,
} from "../services/quizzes.services";
import { GenerationStatuses, type AttemptHistoryQuery, type CreateQuizDto, type SubmitAnswerDto } from "../interfaces/quizzes.interfaces";

export const useQuizzes = (projectId: string) =>
    useQuery({
        queryKey: ["quizzes", projectId],
        queryFn: () => getQuizzes(projectId),
        enabled: !!projectId,
        // Poll while any quiz is still being generated (realtime events also invalidate this).
        refetchInterval: (query) =>
            query.state.data?.some((q) => q.status === GenerationStatuses.PENDING || q.status === GenerationStatuses.GENERATING) ? 4000 : false,
    });

export const useQuiz = (id: string | undefined, options: { pollWhileGenerating?: boolean } = {}) =>
    useQuery({
        queryKey: ["quiz", id],
        queryFn: () => getQuiz(id!),
        enabled: !!id,
        refetchInterval: (query) =>
            options.pollWhileGenerating && query.state.data && [GenerationStatuses.PENDING, GenerationStatuses.GENERATING].includes(query.state.data.status as "PENDING")
                ? 3000
                : false,
    });

export const useQuizResults = (id: string | undefined) =>
    useQuery({ queryKey: ["quiz-results", id], queryFn: () => getQuizResults(id!), enabled: !!id });

export const useReviewOverview = (projectId: string) =>
    useQuery({ queryKey: ["quiz-review", projectId], queryFn: () => getReviewOverview(projectId), enabled: !!projectId });

export const useProjectDocumentOptions = (projectId: string) =>
    useQuery({ queryKey: ["quiz-document-options", projectId], queryFn: () => getProjectDocumentOptions(projectId), enabled: !!projectId, staleTime: 60_000 });

export const useAttemptHistory = (projectId: string, query?: AttemptHistoryQuery) =>
    useQuery({ queryKey: ["attempts", projectId, query], queryFn: () => getAttemptHistory(projectId, query), enabled: !!projectId });

export const useAttempt = (id: string | undefined) =>
    useQuery({ queryKey: ["attempt", id], queryFn: () => getAttempt(id!), enabled: !!id, refetchOnWindowFocus: false });

export const useAttemptSummary = (id: string | undefined) =>
    useQuery({ queryKey: ["attempt-summary", id], queryFn: () => getAttemptSummary(id!), enabled: !!id });

export const useCreateQuiz = (projectId: string, options: { silent?: boolean } = {}) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateQuizDto) => createQuiz(projectId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            if (!options.silent) toast({ title: "Generating your quiz", description: "Questions are being prepared from your material.", duration: 2500 });
        },
        onError: (error: Error) => {
            toast({ title: "Could not create quiz", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteQuiz,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: "Quiz deleted", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not delete quiz", description: error.message, variant: "error" }),
    });
};

export const useShareQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: shareQuiz,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: "Quiz shared", description: "Project members can now take this quiz and compare results.", duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not share quiz", description: error.message, variant: "error" }),
    });
};

export const useStartAttempt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: startAttempt,
        onSuccess: (data) => {
            queryClient.setQueryData(["attempt", data.attempt.id], data);
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        },
        onError: (error: Error) => toast({ title: "Could not start quiz", description: error.message, variant: "error" }),
    });
};

/** Silent on success: the quiz player renders inline feedback instead of toasts. */
export const useSubmitAnswer = (attemptId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: SubmitAnswerDto) => submitAnswer(attemptId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
        },
        onError: (error: Error) => toast({ title: "Answer not saved", description: error.message, variant: "error" }),
    });
};

export const useCompleteAttempt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: completeAttempt,
        onSuccess: (data) => {
            queryClient.setQueryData(["attempt-summary", data.attempt.id], data);
            queryClient.invalidateQueries({ queryKey: ["attempts"] });
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            queryClient.invalidateQueries({ queryKey: ["quiz-review"] });
            queryClient.invalidateQueries({ queryKey: ["attempt", data.attempt.id] });
            toast({ title: "Quiz submitted", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not submit quiz", description: error.message, variant: "error" }),
    });
};
