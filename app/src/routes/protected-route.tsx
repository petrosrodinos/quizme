import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { isTokenExpired } from "@/lib/token";
import { Routes } from "@/routes/routes";

interface ProtectedRouteProps {
    children: ReactNode;
    /** true → requires a signed-in user; false → only for signed-out users (auth pages). */
    loggedIn: boolean;
}

export default function ProtectedRoute({ children, loggedIn }: ProtectedRouteProps) {
    const { isLoggedIn, expires_in } = useAuthStore();
    const location = useLocation();
    const active = isLoggedIn && !(expires_in && isTokenExpired(expires_in));

    if (loggedIn && !active) {
        const next = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`${Routes.auth.sign_in}?next=${next}`} replace />;
    }
    if (!loggedIn && active) {
        return <Navigate to={Routes.dashboard} replace />;
    }
    return <>{children}</>;
}
