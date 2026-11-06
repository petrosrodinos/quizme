import { Features } from "@/config/features";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { Routes } from "@/routes/routes";
import { toast } from "@/hooks/use-toast";
import { browserTimezone } from "@/lib/date";
import { tr } from "@/lib/i18n-options";
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
            toast({ title: tr("auth:toasts.signedIn.title"), description: tr("auth:toasts.signedIn.description"), duration: 2000 });
        },
        onError: (error: Error) => {
            toast({ title: tr("auth:toasts.signInFailed"), description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useSignup() {
    const onAuthenticated = useOnAuthenticated();
    return useMutation({
        mutationFn: (data: SignUpDto) => signUp({ ...data, timezone: data.timezone ?? browserTimezone() }),
        onSuccess: (session) => {
            onAuthenticated(session);
            toast({ title: tr("auth:toasts.accountCreated.title"), description: Features.emailVerification ? tr("auth:toasts.accountCreated.description") : undefined, duration: 3000 });
        },
        onError: (error: Error) => {
            toast({ title: tr("auth:toasts.signUpFailed"), description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useGoogleSignin() {
    const onAuthenticated = useOnAuthenticated();
    return useMutation({
        mutationFn: (idToken: string) => signInWithGoogle(idToken, browserTimezone()),
        onSuccess: (session) => {
            onAuthenticated(session);
            toast({ title: tr("auth:toasts.googleSignedIn"), duration: 2000 });
        },
        onError: (error: Error) => {
            toast({ title: tr("auth:toasts.googleFailed"), description: error.message, duration: 4000, variant: "error" });
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
            toast({ title: tr("auth:toasts.signedOut"), duration: 2000 });
        },
        onError: (error: Error) => {
            toast({ title: tr("auth:toasts.signOutFailed"), description: error.message, variant: "error" });
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
        onSuccess: () => toast({ title: tr("auth:forgot.sentTitle"), description: tr("auth:forgot.sentDescription"), duration: 5000 }),
        onError: (error: Error) => toast({ title: tr("auth:toasts.forgotFailed"), description: error.message, variant: "error" }),
    });
}

export function useResetPassword() {
    const navigate = useNavigate();
    return useMutation({
        mutationFn: (dto: ResetPasswordDto) => resetPassword(dto),
        onSuccess: () => {
            toast({ title: tr("auth:toasts.passwordUpdated.title"), description: tr("auth:toasts.passwordUpdated.description"), duration: 4000 });
            navigate(Routes.auth.sign_in, { replace: true });
        },
        onError: (error: Error) => toast({ title: tr("auth:toasts.resetFailed"), description: error.message, variant: "error" }),
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
            toast({ title: tr("auth:verify.successTitle"), description: tr("auth:verify.successDescription"), duration: 3000 });
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
        onSuccess: () => toast({ title: tr("auth:toasts.verificationSent.title"), description: tr("auth:toasts.verificationSent.description"), duration: 4000 }),
        onError: (error: Error) => toast({ title: tr("auth:toasts.emailFailed"), description: error.message, variant: "error" }),
    });
}

export function useChangePassword() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: ChangePasswordDto) => changePassword(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast({ title: tr("auth:toasts.passwordChanged.title"), description: tr("auth:toasts.passwordChanged.description"), duration: 3000 });
        },
        onError: (error: Error) => toast({ title: tr("auth:toasts.changePasswordFailed"), description: error.message, variant: "error" }),
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
            toast({ title: tr("auth:toasts.sessionRevoked"), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("auth:toasts.revokeFailed"), description: error.message, variant: "error" }),
    });
}

export function useRevokeOtherSessions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => revokeOtherSessions(),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast({ title: tr("auth:toasts.othersRevoked.title"), description: tr("auth:toasts.othersRevoked.description", { count: res.revoked }), duration: 3000 });
        },
        onError: (error: Error) => toast({ title: tr("auth:toasts.revokeOthersFailed"), description: error.message, variant: "error" }),
    });
}
