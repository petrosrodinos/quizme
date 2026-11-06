import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import { tr } from "@/lib/i18n-options";
import { currentLanguage } from "@/i18n";
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
    withApiError(async () => (await axiosInstance.post<AuthSession>(ApiRoutes.auth.login, dto)).data, tr("auth:errors.signIn"));

export const signUp = (dto: SignUpDto) =>
    withApiError(async () => (await axiosInstance.post<AuthSession>(ApiRoutes.auth.register, { ...dto, language: dto.language ?? currentLanguage() })).data, tr("auth:errors.signUp"));

export const signInWithGoogle = (id_token: string, timezone?: string) =>
    withApiError(async () => (await axiosInstance.post<AuthSession>(ApiRoutes.auth.google, { id_token, timezone, language: currentLanguage() })).data, tr("auth:errors.google"));

export const signOut = () => withApiError(async () => (await axiosInstance.post(ApiRoutes.auth.logout)).data, tr("auth:errors.signOut"));

export const getMe = () => withApiError(async () => (await axiosInstance.get<AuthUser>(ApiRoutes.auth.me)).data, tr("auth:errors.me"));

export const forgotPassword = (email: string) =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.forgot_password, { email })).data, tr("auth:errors.forgot"));

export const resetPassword = (dto: ResetPasswordDto) =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.reset_password, dto)).data, tr("auth:errors.reset"));

export const verifyEmail = (token: string) =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.verify_email, { token })).data, tr("auth:errors.verify"));

export const resendVerification = () =>
    withApiError(async () => (await axiosInstance.post<MessageResponse>(ApiRoutes.auth.resend_verification)).data, tr("auth:errors.resend"));

export const changePassword = (dto: ChangePasswordDto) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.auth.change_password, dto)).data, tr("auth:errors.changePassword"));

export const getSessions = () =>
    withApiError(async () => (await axiosInstance.get<ActiveSession[]>(ApiRoutes.auth.sessions)).data, tr("auth:errors.sessions"));

export const revokeSession = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.auth.session(id))).data, tr("auth:errors.revokeSession"));

export const revokeOtherSessions = () =>
    withApiError(async () => (await axiosInstance.post<{ revoked: number }>(ApiRoutes.auth.revoke_other_sessions)).data, tr("auth:errors.revokeSessions"));
