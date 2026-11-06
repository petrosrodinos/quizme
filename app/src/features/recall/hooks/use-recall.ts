import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { RecallMode } from "../interfaces/recall.interfaces";
import { evaluateRecall, getRecallHistory, getRecallPrompts } from "../services/recall.services";
import { tr } from "@/lib/i18n-options";

export const useRecallHistory = (projectId: string) =>
    useQuery({ queryKey: ["recall-history", projectId], queryFn: () => getRecallHistory(projectId), enabled: !!projectId });

export const useGenerateRecallPrompts = () =>
    useMutation({
        mutationFn: ({ projectId, ...params }: { projectId: string; mode: RecallMode; topic_id?: string; count?: number }) => getRecallPrompts(projectId, params),
        onSuccess: (prompts) => toast({ title: tr("recall:toasts.promptsReady", { count: prompts.length }), duration: 1500 }),
        onError: (e: Error) => toast({ title: tr("recall:toasts.promptsFailed"), description: e.message, variant: "error" }),
    });

export const useEvaluateRecall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: evaluateRecall,
        onSuccess: (r) => {
            queryClient.invalidateQueries({ queryKey: ["recall-history"] });
            toast({ title: tr("recall:toasts.scored", { score: r.evaluation.score }), duration: 1800 });
        },
        onError: (e: Error) => toast({ title: tr("recall:toasts.evaluateFailed"), description: e.message, variant: "error" }),
    });
};
