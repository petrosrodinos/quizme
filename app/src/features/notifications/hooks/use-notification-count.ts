import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { getUnreadNotificationCount } from "../services/notification-count.services";

/** Query key lives under ["notifications"] so invalidating notifications refreshes the badge. */
export const useUnreadNotificationCount = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({
        queryKey: ["notifications", "unread-count"],
        queryFn: getUnreadNotificationCount,
        enabled: isLoggedIn,
        refetchInterval: 120_000,
        retry: 1,
    });
};
