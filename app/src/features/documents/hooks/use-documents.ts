import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { deleteDocument, getDocument, getDocumentContent, getDocumentDownloadUrl, getDocuments, reprocessDocument, uploadDocuments } from "../services/documents.services";
import { isProcessing, type DocumentStatusEvent, type StudyDocument } from "../interfaces/documents.interfaces";
import { tr } from "@/lib/i18n-options";

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

const onError = (titleKey: string) => (error: Error) => toast({ title: tr(titleKey), description: error.message, variant: "error" });

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
                title: queued ? tr("documents:toasts.uploaded", { count: queued }) : tr("documents:toasts.nothingUploaded"),
                description: queued
                    ? skipped
                        ? tr("documents:toasts.processingStartedSkipped", { count: skipped })
                        : tr("documents:toasts.processingStarted")
                    : tr("documents:toasts.allSkipped"),
                duration: 3000,
                variant: queued ? undefined : "error",
            });
        },
        onError: onError("documents:toasts.uploadFailed"),
    });
};

export const useDownloadDocument = () =>
    useMutation({
        mutationFn: getDocumentDownloadUrl,
        onSuccess: ({ url }) => {
            window.open(url, "_blank", "noopener");
            toast({ title: tr("documents:toasts.downloadStarted"), duration: 1500 });
        },
        onError: onError("documents:toasts.downloadFailed"),
    });

export const useReprocessDocument = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reprocessDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            toast({ title: tr("documents:toasts.reprocessStarted"), duration: 2000 });
        },
        onError: onError("documents:toasts.reprocessFailed"),
    });
};

export const useDeleteDocument = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["project-overview"] });
            toast({ title: tr("documents:toasts.deleted"), duration: 2000 });
        },
        onError: onError("documents:toasts.deleteFailed"),
    });
};

/** Resolves a document (e.g. from a search passage that only carries document_id) so the caller can navigate to it. */
export const useResolveDocument = () =>
    useMutation({
        mutationFn: getDocument,
        onError: onError("documents:toasts.openFailed"),
    });
