import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { NotesQuery } from "../interfaces/notes.interfaces";
import { createNote, deleteNote, getNotes, transformNotes, updateNote } from "../services/notes.services";
import { tr } from "@/lib/i18n-options";

export const useNotes = (projectId: string, query: NotesQuery) =>
    useQuery({ queryKey: ["notes", projectId, query], queryFn: () => getNotes(projectId, query), enabled: !!projectId, placeholderData: (prev) => prev });

export const useCreateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: tr("notes:toasts.saved"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("notes:toasts.saveFailed"), description: e.message, variant: "error" }),
    });
};

export const useUpdateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: tr("notes:toasts.updated"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("notes:toasts.updateFailed"), description: e.message, variant: "error" }),
    });
};

export const useDeleteNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: tr("notes:toasts.deleted"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("notes:toasts.deleteFailed"), description: e.message, variant: "error" }),
    });
};

export const useTransformNotes = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: transformNotes,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            if (result.kind === "flashcards") queryClient.invalidateQueries({ queryKey: ["flashcards"] });
            if (result.kind === "quiz") queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({
                title: tr(result.kind === "flashcards" ? "notes:toasts.transformFlashcards" : result.kind === "quiz" ? "notes:toasts.transformQuiz" : "notes:toasts.transformNote"),
                description: result.kind === "flashcards" ? tr("notes:toasts.transformFlashcardsDescription") : undefined,
                duration: 2500,
            });
        },
        onError: (e: Error) => toast({ title: tr("notes:toasts.transformFailed"), description: e.message, variant: "error" }),
    });
};
