import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { deleteDocument, getDocument, getDocumentContent, getDocumentDownloadUrl, getDocuments, reprocessDocument, uploadDocuments } from "../services/documents.services";
import { isProcessing, type DocumentStatusEvent, type StudyDocument } from "../interfaces/documents.interfaces";

/** Project documents with live processing status (socket push + polling fallback while anything is processing). */
export const useDocuments = (projectId: string | undefined) => {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ["documents", projectId],
        queryFn: () => getDocuments(projectId!),
        enabled: !!projectId,
        refetchInterval: (q) => ((q.state.data as StudyDocument[] | undefined)?.some((d) => isProcessing(d.status)) ? 4000 : false),
    });
    useRealtimeEvent<DocumentStatusEvent>(RealtimeEvents.DOCUMENT_STATUS, (e) => {
        if (e.project_id !== projectId) return;
        queryClient.setQueryData<StudyDocument[]>(["documents", projectId], (prev) =>
            prev?.map((d) => (d.id === e.id ? { ...d, status: e.status, progress: e.progress, error_message: e.error_message, chunk_count: e.chunk_count } : d)),
        );
        if (e.status === "READY" || e.status === "FAILED") {
            queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-overview", projectId] });
        }
    });
    return query;
};

export const useDocument = (id: string | undefined) =>
    useQuery({
        queryKey: ["document", id],
        queryFn: () => getDocument(id!),
        enabled: !!id,
        staleTime: 30 * 60_000,
    });

export const useDocumentContent = (id: string | undefined) =>
    useInfiniteQuery({
        queryKey: ["document-content", id],
        queryFn: ({ pageParam }) => getDocumentContent(id!, pageParam),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.pagination.has_next ? last.pagination.page + 1 : undefined),
        enabled: !!id,
    });

const onError = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

export const useUploadDocuments = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadDocuments,
        onSuccess: (res, vars) => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["project-overview", vars.projectId] });
            const queued = res.results.filter((r) => r.status === "queued").length;
            const skipped = res.results.length - queued;
            toast({
                title: queued ? `${queued} file${queued === 1 ? "" : "s"} uploaded` : "Nothing new uploaded",
                description: queued ? `Processing has started.${skipped ? ` ${skipped} skipped.` : ""}` : "All files were duplicates or rejected.",
                duration: 3000,
                variant: queued ? undefined : "error",
            });
        },
        onError: onError("Upload failed"),
    });
};

export const useDownloadDocument = () =>
    useMutation({
        mutationFn: getDocumentDownloadUrl,
        onSuccess: ({ url }) => {
            window.open(url, "_blank", "noopener");
            toast({ title: "Download started", duration: 1500 });
        },
        onError: onError("Could not download"),
    });

export const useReprocessDocument = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reprocessDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            toast({ title: "Reprocessing started", duration: 2000 });
        },
        onError: onError("Could not reprocess"),
    });
};

export const useDeleteDocument = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["project-overview"] });
            toast({ title: "Document deleted", duration: 2000 });
        },
        onError: onError("Could not delete document"),
    });
};

/** Resolves a document (e.g. from a search passage that only carries document_id) so the caller can navigate to it. */
export const useResolveDocument = () =>
    useMutation({
        mutationFn: getDocument,
        onError: onError("Could not open document"),
    });
