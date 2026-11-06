import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type {
    ActiveSession,
    AuthSession,
    AuthUser,
    ChangePasswordDto,
    MessageResponse,
    ResetPasswordDto,
    SignInDto,
    SignUpDto,
} from "../interfaces/auth.interface";

export const signIn = (dto: SignInDto) =>
    withApiError(async () => (await axiosInstance.post<AuthSession>(ApiRoutes.auth.login, dto)).data, "Failed to sign in. Please try again.");

export const signUp = (dto: SignUpDto) =>
    withApiError(async () => (await axiosInstance.post<AuthSession>(ApiRoutes.auth.register, dto)).data, "Failed to create your account.");

export const signInWithGoogle = (id_token: string, timezone?: string) =>
    withApiError(async () => (await axiosInstance.post<AuthSession>(ApiRoutes.auth.google, { id_token, timezone })).data, "Google sign-in failed.");

export const signOut = () => withApiError(async () => (await axiosInstance.post(ApiRoutes.auth.logout)).data, "Failed to sign out.");

export const getMe = () => withApiError(async () => (await axiosInstance.get<AuthUser>(ApiRoutes.auth.me)).data, "Failed to load your account.");

export const forgotPassword = (email: string) =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.forgot_password, { email })).data, "Failed to send reset email.");

export const resetPassword = (dto: ResetPasswordDto) =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.reset_password, dto)).data, "Failed to reset password.");

export const verifyEmail = (token: string) =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.verify_email, { token })).data, "Failed to verify email.");

export const resendVerification = () =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.resend_verification)).data, "Failed to resend verification email.");

export const changePassword = (dto: ChangePasswordDto) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.auth.change_password, dto)).data, "Failed to change password.");

export const getSessions = () =>
    withApiError(async () => (await axiosInstance.get<ActiveSession[]>(ApiRoutes.auth.sessions)).data, "Failed to load sessions.");

export const revokeSession = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.auth.session(id))).data, "Failed to revoke session.");

export const revokeOtherSessions = () =>
    withApiError(async () => (await axiosInstance.post<{ revoked: number }>(ApiRoutes.auth.revoke_other_sessions)).data, "Failed to revoke sessions.");
