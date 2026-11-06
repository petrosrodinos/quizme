import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { RecallMode } from "../interfaces/recall.interfaces";
import { evaluateRecall, getRecallHistory, getRecallPrompts } from "../services/recall.services";

export const useRecallHistory = (projectId: string) =>
    useQuery({ queryKey: ["recall-history", projectId], queryFn: () => getRecallHistory(projectId), enabled: !!projectId });

export const useGenerateRecallPrompts = () =>
    useMutation({
        mutationFn: ({ projectId, ...params }: { projectId: string; mode: RecallMode; topic_id?: string; count?: number }) => getRecallPrompts(projectId, params),
        onSuccess: (prompts) => toast({ title: `${prompts.length} prompt${prompts.length === 1 ? "" : "s"} ready`, duration: 1500 }),
        onError: (e: Error) => toast({ title: "Could not generate prompts", description: e.message, variant: "error" }),
    });

export const useEvaluateRecall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: evaluateRecall,
        onSuccess: (r) => {
            queryClient.invalidateQueries({ queryKey: ["recall-history"] });
            toast({ title: `Scored ${r.evaluation.score}/100`, duration: 1800 });
        },
        onError: (e: Error) => toast({ title: "Could not evaluate", description: e.message, variant: "error" }),
    });
};
