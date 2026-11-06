import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notifications.services";
import type { NotificationQuery } from "../interfaces/notifications.interfaces";
import { tr } from "@/lib/i18n-options";

/** All keys live under ["notifications"] so realtime invalidation refreshes lists and the unread badge. */
export const useNotifications = (query: NotificationQuery, enabled = true) =>
    useQuery({ queryKey: ["notifications", "list", query], queryFn: () => getNotifications(query), enabled, placeholderData: (prev) => prev });

export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        onError: (error: Error) => toast({ title: tr("notifications:toasts.updateFailed"), description: error.message, variant: "error" }),
    });
};

export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({ title: tr("notifications:toasts.allRead"), description: res.updated ? tr("notifications:toasts.markedRead", { count: res.updated }) : undefined, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: tr("notifications:toasts.updateAllFailed"), description: error.message, variant: "error" }),
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({ title: tr("notifications:toasts.removed"), duration: 1500 });
        },
        onError: (error: Error) => toast({ title: tr("notifications:toasts.deleteFailed"), description: error.message, variant: "error" }),
    });
};
