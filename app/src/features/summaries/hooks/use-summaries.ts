import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createSummary, deleteSummary, getSummaries, getSummary } from "../services/summaries.services";
import { tr } from "@/lib/i18n-options";

export const isSummaryGenerating = (status?: string) => status === "PENDING" || status === "GENERATING";

export const useSummaries = (projectId: string) =>
    useQuery({
        queryKey: ["summaries", projectId],
        queryFn: () => getSummaries(projectId),
        enabled: !!projectId,
        refetchInterval: (q) => (q.state.data?.some((s) => isSummaryGenerating(s.status)) ? 4000 : false),
    });

/** Polls while the summary is being generated (socket events also invalidate this key). */
export const useSummary = (id: string | null) =>
    useQuery({
        queryKey: ["summary", id],
        queryFn: () => getSummary(id!),
        enabled: !!id,
        refetchInterval: (q) => (isSummaryGenerating(q.state.data?.status) ? 3000 : false),
    });

export const useCreateSummary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSummary,
        onSuccess: (s) => {
            queryClient.invalidateQueries({ queryKey: ["summaries"] });
            toast({ title: tr(s.cached && s.status === "READY" ? "summaries:toasts.loadedCached" : "summaries:toasts.generating"), duration: 2000 });
        },
        onError: (e: Error) => toast({ title: tr("summaries:toasts.generateFailed"), description: e.message, variant: "error" }),
    });
};

export const useDeleteSummary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSummary,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["summaries"] });
            toast({ title: tr("summaries:toasts.deleted"), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("summaries:toasts.deleteFailed"), description: e.message, variant: "error" }),
    });
};
