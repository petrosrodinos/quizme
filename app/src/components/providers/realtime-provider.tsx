import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";
import { realtimeConnect, realtimeDisconnect } from "@/features/realtime/services/realtime.services";

/** Keeps the authenticated Socket.IO connection in sync with the auth state. */
export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
    const token = useAuthStore((s) => s.access_token);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

    useEffect(() => {
        if (isLoggedIn && token) realtimeConnect(token);
        else realtimeDisconnect();
    }, [isLoggedIn, token]);

    useEffect(() => () => realtimeDisconnect(), []);

    return <>{children}</>;
};
