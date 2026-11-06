import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { ChatMessage, ThreadMessages } from "../interfaces/tutor.interfaces";
import { createThread, deleteThread, getMessages, getThreads, sendMessage, updateThread } from "../services/tutor.services";

export const useThreads = (projectId: string) => useQuery({ queryKey: ["tutor-threads", projectId], queryFn: () => getThreads(projectId), enabled: !!projectId });

export const useThreadMessages = (threadId: string | null) =>
    useQuery({ queryKey: ["tutor-messages", threadId], queryFn: () => getMessages(threadId!), enabled: !!threadId });

export const useCreateThread = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createThread,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tutor-threads"] });
            toast({ title: "New conversation", duration: 1500 });
        },
        onError: (e: Error) => toast({ title: "Could not start conversation", description: e.message, variant: "error" }),
    });
};

export const useUpdateThread = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateThread,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tutor-threads"] });
            queryClient.invalidateQueries({ queryKey: ["tutor-messages"] });
            toast({ title: "Conversation updated", duration: 1500 });
        },
        onError: (e: Error) => toast({ title: "Could not update conversation", description: e.message, variant: "error" }),
    });
};

export const useDeleteThread = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteThread,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tutor-threads"] });
            toast({ title: "Conversation deleted", duration: 1500 });
        },
        onError: (e: Error) => toast({ title: "Could not delete conversation", description: e.message, variant: "error" }),
    });
};

/** Optimistically appends the student message, then replaces it with the server pair. */
export const useSendMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sendMessage,
        onMutate: async ({ threadId, dto }) => {
            const key = ["tutor-messages", threadId];
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<ThreadMessages>(key);
            if (previous) {
                const temp: ChatMessage = {
                    id: `temp-${Date.now()}`,
                    thread_id: threadId,
                    role: "USER",
                    content: dto.content,
                    citations: null,
                    grounded: true,
                    model: null,
                    created_at: new Date().toISOString(),
                };
                queryClient.setQueryData<ThreadMessages>(key, { ...previous, messages: [...previous.messages, temp] });
            }
            return { previous };
        },
        onSuccess: (result, { threadId }) => {
            const key = ["tutor-messages", threadId];
            const existing = queryClient.getQueryData<ThreadMessages>(key);
            if (existing) {
                queryClient.setQueryData<ThreadMessages>(key, {
                    ...existing,
                    messages: [...existing.messages.filter((m) => !m.id.startsWith("temp-")), result.user_message, result.assistant_message],
                });
            } else queryClient.invalidateQueries({ queryKey: key });
            queryClient.invalidateQueries({ queryKey: ["tutor-threads"] });
        },
        onError: (e: Error, { threadId }, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(["tutor-messages", threadId], ctx.previous);
            toast({ title: "Message not sent", description: e.message, variant: "error" });
        },
    });
};
