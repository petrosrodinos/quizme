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
            toast({ title: "Rebuilding knowledge map", description: "This runs in the background and takes a moment.", duration: 3000 });
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ["topics"] }), 8000);
        },
        onError: (error: Error) => toast({ title: "Could not rebuild map", description: error.message, variant: "error" }),
    });
};

export const useCreateTopic = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTopicDto) => createTopic(projectId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
            toast({ title: "Topic added", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not add topic", description: error.message, variant: "error" }),
    });
};

export const useUpdateTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateTopicDto }) => updateTopic(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
            toast({ title: "Topic updated", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not update topic", description: error.message, variant: "error" }),
    });
};

export const useDeleteTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTopic,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topics"] });
            toast({ title: "Topic deleted", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not delete topic", description: error.message, variant: "error" }),
    });
};
