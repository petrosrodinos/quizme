import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AcceptInvitationResult, InvitationPreview, MyInvitation } from "../interfaces/invitations.interfaces";
import { tr } from "@/lib/i18n-options";

export const getMyInvitations = () =>
    withApiError(async () => (await axiosInstance.get<MyInvitation[]>(ApiRoutes.invitations.prefix)).data, tr("invitations:errors.loadInvitations"));

export const getInvitationPreview = (token: string) =>
    withApiError(async () => (await axiosInstance.get<InvitationPreview>(ApiRoutes.invitations.by_token(token))).data, tr("invitations:errors.loadInvitation"));

export const acceptInvitationByToken = (token: string) =>
    withApiError(async () => (await axiosInstance.post<AcceptInvitationResult>(ApiRoutes.invitations.accept_token(token))).data, tr("invitations:errors.accept"));

export const acceptInvitation = (id: string) =>
    withApiError(async () => (await axiosInstance.post<AcceptInvitationResult>(ApiRoutes.invitations.accept(id))).data, tr("invitations:errors.accept"));

export const declineInvitation = (id: string) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.invitations.decline(id))).data, tr("invitations:errors.decline"));
