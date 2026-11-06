import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notifications.services";
import type { NotificationQuery } from "../interfaces/notifications.interfaces";

/** All keys live under ["notifications"] so realtime invalidation refreshes lists and the unread badge. */
export const useNotifications = (query: NotificationQuery, enabled = true) =>
    useQuery({ queryKey: ["notifications", "list", query], queryFn: () => getNotifications(query), enabled, placeholderData: (prev) => prev });

export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        onError: (error: Error) => toast({ title: "Could not update notification", description: error.message, variant: "error" }),
    });
};

export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({ title: "All caught up", description: res.updated ? `${res.updated} marked as read` : undefined, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update notifications", description: error.message, variant: "error" }),
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({ title: "Notification removed", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not delete notification", description: error.message, variant: "error" }),
    });
};
