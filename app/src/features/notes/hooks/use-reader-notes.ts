import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createReaderNote, getReaderNotes } from "../services/reader-notes.services";
import { tr } from "@/lib/i18n-options";

/** Notes/highlights attached to a document, for rendering inside the reader. */
export const useDocumentNotes = (projectId: string, documentId: string | undefined) =>
    useQuery({
        queryKey: ["notes", projectId, { document_id: documentId }],
        queryFn: () => getReaderNotes(projectId, { document_id: documentId }),
        enabled: !!documentId,
        retry: 0,
    });

export const useCreateReaderNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createReaderNote,
        onSuccess: (note) => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast({ title: note.type === "HIGHLIGHT" ? tr("reader:toasts.highlightSaved") : tr("reader:toasts.noteSaved"), duration: 1800 });
        },
        onError: (error: Error) => toast({ title: tr("reader:toasts.noteFailed"), description: error.message, variant: "error" }),
    });
};
