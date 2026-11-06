import { tr } from "@/lib/i18n-options";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createQuestion, deleteQuestion, getQuestion, getQuestions, restoreQuestionVersion, updateQuestion } from "../services/questions.services";
import type { CreateQuestionDto, QuestionQuery, UpdateQuestionDto } from "../interfaces/questions.interfaces";

export const useQuestions = (projectId: string, query: QuestionQuery) =>
    useQuery({
        queryKey: ["questions", projectId, query],
        queryFn: () => getQuestions(projectId, query),
        enabled: !!projectId,
        placeholderData: keepPreviousData,
    });

export const useQuestion = (id: string | undefined) =>
    useQuery({ queryKey: ["question", id], queryFn: () => getQuestion(id!), enabled: !!id });

export const useCreateQuestion = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateQuestionDto) => createQuestion(projectId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            toast({ title: tr("questions:toasts.added"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("questions:toasts.addFailed"), description: error.message, variant: "error" }),
    });
};

export const useUpdateQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateQuestionDto }) => updateQuestion(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            queryClient.invalidateQueries({ queryKey: ["question"] });
            toast({ title: tr("questions:toasts.updated"), description: tr("questions:toasts.updatedDescription"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("questions:toasts.updateFailed"), description: error.message, variant: "error" }),
    });
};

export const useDeleteQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteQuestion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            toast({ title: tr("questions:toasts.deleted"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("questions:toasts.deleteFailed"), description: error.message, variant: "error" }),
    });
};

export const useRestoreQuestionVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, version }: { id: string; version: number }) => restoreQuestionVersion(id, version),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            queryClient.invalidateQueries({ queryKey: ["question"] });
            toast({ title: tr("questions:toasts.restored"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("questions:toasts.restoreFailed"), description: error.message, variant: "error" }),
    });
};
