import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { Routes } from "@/routes/routes";
import { toast } from "@/hooks/use-toast";
import { browserTimezone } from "@/lib/date";
import {
    changePassword,
    forgotPassword,
    getMe,
    getSessions,
    resendVerification,
    resetPassword,
    revokeOtherSessions,
    revokeSession,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
    verifyEmail,
} from "../services/auth";
import type { AuthSession, ChangePasswordDto, ResetPasswordDto, SignInDto, SignUpDto } from "../interfaces/auth.interface";

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : Routes.dashboard);

const useOnAuthenticated = () => {
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const queryClient = useQueryClient();
    return (session: AuthSession) => {
        queryClient.clear();
        login(session);
        navigate(safeNext(params.get("next")), { replace: true });
    };
};

export function useSignin() {
    const onAuthenticated = useOnAuthenticated();
    return useMutation({
        mutationFn: (data: SignInDto) => signIn(data),
        onSuccess: (session) => {
            onAuthenticated(session);
            toast({ title: "Welcome back", description: "You're signed in.", duration: 2000 });
        },
        onError: (error: Error) => {
            toast({ title: "Could not sign in", description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useSignup() {
    const onAuthenticated = useOnAuthenticated();
    return useMutation({
        mutationFn: (data: SignUpDto) => signUp({ ...data, timezone: data.timezone ?? browserTimezone() }),
        onSuccess: (session) => {
            onAuthenticated(session);
            toast({ title: "Account created", description: "Check your inbox to verify your email.", duration: 3000 });
        },
        onError: (error: Error) => {
            toast({ title: "Could not create account", description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useGoogleSignin() {
    const onAuthenticated = useOnAuthenticated();
    return useMutation({
        mutationFn: (idToken: string) => signInWithGoogle(idToken, browserTimezone()),
        onSuccess: (session) => {
            onAuthenticated(session);
            toast({ title: "Signed in with Google", duration: 2000 });
        },
        onError: (error: Error) => {
            toast({ title: "Google sign-in failed", description: error.message, duration: 4000, variant: "error" });
        },
    });
}

/** Revokes the server session (best effort), then clears all client state. */
export function useLogout() {
    const clear = useAuthStore((s) => s.clear);
    const resetPrefs = usePreferencesStore((s) => s.reset);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: async () => {
            try {
                await signOut();
            } catch {
                /* session may already be invalid */
            }
        },
        onSuccess: () => {
            clear();
            resetPrefs();
            queryClient.clear();
            navigate(Routes.auth.sign_in, { replace: true });
            toast({ title: "Signed out", duration: 2000 });
        },
        onError: (error: Error) => {
            toast({ title: "Could not sign out", description: error.message, variant: "error" });
        },
    });
}

export function useMe() {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const updateUser = useAuthStore((s) => s.updateUser);
    return useQuery({
        queryKey: ["me"],
        queryFn: async () => {
            const me = await getMe();
            updateUser(me);
            return me;
        },
        enabled: isLoggedIn,
        staleTime: 60_000,
    });
}

export function useForgotPassword() {
    return useMutation({
        mutationFn: (email: string) => forgotPassword(email),
        onSuccess: (res) => toast({ title: "Check your inbox", description: res.message, duration: 5000 }),
        onError: (error: Error) => toast({ title: "Could not send reset email", description: error.message, variant: "error" }),
    });
}

export function useResetPassword() {
    const navigate = useNavigate();
    return useMutation({
        mutationFn: (dto: ResetPasswordDto) => resetPassword(dto),
        onSuccess: (res) => {
            toast({ title: "Password updated", description: res.message, duration: 4000 });
            navigate(Routes.auth.sign_in, { replace: true });
        },
        onError: (error: Error) => toast({ title: "Could not reset password", description: error.message, variant: "error" }),
    });
}

/**
 * Verifies the emailed token exactly once. Modelled as a query keyed by the token (not a mutation) so the
 * one-shot request survives React StrictMode remounts and is never re-sent (tokens are single use).
 */
export function useVerifyEmail(token: string) {
    const queryClient = useQueryClient();
    const updateUser = useAuthStore((s) => s.updateUser);
    return useQuery({
        queryKey: ["verify-email", token],
        queryFn: async () => {
            const res = await verifyEmail(token);
            updateUser({ email_verified: true });
            queryClient.invalidateQueries({ queryKey: ["me"] });
            toast({ title: "Email verified", description: "Thanks for confirming your email.", duration: 3000 });
            return res;
        },
        enabled: !!token,
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useResendVerification() {
    return useMutation({
        mutationFn: () => resendVerification(),
        onSuccess: (res) => toast({ title: "Verification email sent", description: res.message, duration: 4000 }),
        onError: (error: Error) => toast({ title: "Could not send email", description: error.message, variant: "error" }),
    });
}

export function useChangePassword() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: ChangePasswordDto) => changePassword(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast({ title: "Password changed", description: "Other sessions were signed out.", duration: 3000 });
        },
        onError: (error: Error) => toast({ title: "Could not change password", description: error.message, variant: "error" }),
    });
}

export function useSessions() {
    return useQuery({ queryKey: ["sessions"], queryFn: getSessions });
}

export function useRevokeSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => revokeSession(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast({ title: "Session revoked", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not revoke session", description: error.message, variant: "error" }),
    });
}

export function useRevokeOtherSessions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => revokeOtherSessions(),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast({ title: "Other sessions signed out", description: `${res.revoked} session(s) revoked.`, duration: 3000 });
        },
        onError: (error: Error) => toast({ title: "Could not revoke sessions", description: error.message, variant: "error" }),
    });
}
