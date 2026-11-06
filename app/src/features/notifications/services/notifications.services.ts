import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { NotificationQuery, NotificationsPage } from "../interfaces/notifications.interfaces";
import { tr } from "@/lib/i18n-options";

export const getNotifications = (query: NotificationQuery) =>
    withApiError(
        async () =>
            (
                await axiosInstance.get<NotificationsPage>(ApiRoutes.notifications.prefix, {
                    params: { page: query.page ?? 1, limit: query.limit ?? 20, ...(query.unread ? { unread: "true" } : {}) },
                })
            ).data,
        tr("notifications:errors.load"),
    );

export const markNotificationRead = (id: string) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.notifications.read(id))).data, tr("notifications:errors.update"));

export const markAllNotificationsRead = () =>
    withApiError(async () => (await axiosInstance.post<{ updated: number }>(ApiRoutes.notifications.read_all)).data, tr("notifications:errors.updateAll"));

export const deleteNotification = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.notifications.detail(id))).data, tr("notifications:errors.delete"));
