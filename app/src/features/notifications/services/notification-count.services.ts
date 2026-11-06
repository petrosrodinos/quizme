import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";

export const getUnreadNotificationCount = () =>
    withApiError(async () => (await axiosInstance.get<{ count: number }>(ApiRoutes.notifications.unread_count)).data, "Failed to load notifications.");
