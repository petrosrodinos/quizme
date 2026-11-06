import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { NotesQuery } from "../interfaces/notes.interfaces";
import { createNote, deleteNote, getNotes, transformNotes, updateNote } from "../services/notes.services";

export const useNotes = (projectId: string, query: NotesQuery) =>
    useQuery({ queryKey: ["notes", projectId, query], queryFn: () => getNotes(projectId, query), enabled: !!projectId, placeholderData: (prev) => prev });

export const useCreateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: "Note saved", duration: 1800 });
        },
        onError: (e: Error) => toast({ title: "Could not save note", description: e.message, variant: "error" }),
    });
};

export const useUpdateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: "Note updated", duration: 1800 });
        },
        onError: (e: Error) => toast({ title: "Could not update note", description: e.message, variant: "error" }),
    });
};

export const useDeleteNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: "Note deleted", duration: 1800 });
        },
        onError: (e: Error) => toast({ title: "Could not delete note", description: e.message, variant: "error" }),
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
                title: result.kind === "flashcards" ? "Generating flashcards" : result.kind === "quiz" ? "Generating your quiz" : "Created from your notes",
                description: result.kind === "flashcards" ? "They will appear in your deck shortly." : undefined,
                duration: 2500,
            });
        },
        onError: (e: Error) => toast({ title: "Could not transform notes", description: e.message, variant: "error" }),
    });
};
