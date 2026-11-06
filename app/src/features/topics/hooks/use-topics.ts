import { tr } from "@/lib/i18n-options";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createTopic, deleteTopic, getTopicTree, rebuildTopics, updateTopic } from "../services/topics.services";
import type { CreateTopicDto, FlatTopic, TopicNode, UpdateTopicDto } from "../interfaces/topics.interfaces";

export const useTopicTree = (projectId: string) =>
    useQuery({ queryKey: ["topics", projectId], queryFn: () => getTopicTree(projectId), enabled: !!projectId });

const flatten = (nodes: TopicNode[], depth = 0, out: FlatTopic[] = []): FlatTopic[] => {
    for (const n of nodes) {
        out.push({ id: n.id, name: n.name, depth });
        flatten(n.children, depth + 1, out);
    }
    return out;
};

/** Flat list (depth-annotated) for pickers. */
export const useFlatTopics = (projectId: string) => {
    const query = useTopicTree(projectId);
    const flat = useMemo(() => flatten(query.data ?? []), [query.data]);
    return { ...query, flat };
};

export const useRebuildTopics = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => rebuildTopics(projectId),
        onSuccess: () => {
            toast({ title: tr("topics:toasts.rebuilding"), description: tr("topics:toasts.rebuildingDescription"), duration: 3000 });
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ["topics"] }), 8000);
        },
        onError: (error: Error) => toast({ title: tr("topics:toasts.rebuildFailed"), description: error.message, variant: "error" }),
    });
};

export const useCreateTopic = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTopicDto) => createTopic(projectId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
            toast({ title: tr("topics:toasts.added"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("topics:toasts.addFailed"), description: error.message, variant: "error" }),
    });
};

export const useUpdateTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateTopicDto }) => updateTopic(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
            toast({ title: tr("topics:toasts.updated"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("topics:toasts.updateFailed"), description: error.message, variant: "error" }),
    });
};

export const useDeleteTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTopic,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
            toast({ title: tr("topics:toasts.deleted"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("topics:toasts.deleteFailed"), description: error.message, variant: "error" }),
    });
};
