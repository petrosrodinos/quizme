import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import { tr } from "@/lib/i18n-options";

export const getUnreadNotificationCount = () =>
    withApiError(async () => (await axiosInstance.get<{ count: number }>(ApiRoutes.notifications.unread_count)).data, tr("notifications:errors.load"));
