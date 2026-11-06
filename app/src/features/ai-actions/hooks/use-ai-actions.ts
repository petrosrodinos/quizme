import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { lookupWord, runTextAction } from "../services/ai-actions.services";
import { tr } from "@/lib/i18n-options";

export const useTextAction = () =>
    useMutation({
        mutationFn: runTextAction,
        onSuccess: (res) => {
            if (res.cached) toast({ title: tr("reader:toasts.cached"), duration: 1200 });
        },
        onError: (error: Error) => toast({ title: tr("reader:toasts.actionFailed"), description: error.message, variant: "error" }),
    });

/** Word/phrase lookup (cached server-side). Runs automatically for the current selection. */
export const useWordLookup = (projectId: string, word: string | null, context: string, language?: string) =>
    useQuery({
        queryKey: ["word-lookup", projectId, word?.toLowerCase(), context.slice(0, 120), language ?? null],
        queryFn: () => lookupWord({ projectId, dto: { word: word!, context, language } }),
        enabled: !!word,
        staleTime: Infinity,
        retry: 0,
    });
