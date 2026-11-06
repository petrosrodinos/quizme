import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AcceptInvitationResult, InvitationPreview, MyInvitation } from "../interfaces/invitations.interfaces";

export const getMyInvitations = () =>
    withApiError(async () => (await axiosInstance.get<MyInvitation[]>(ApiRoutes.invitations.prefix)).data, "Failed to load invitations.");

export const getInvitationPreview = (token: string) =>
    withApiError(async () => (await axiosInstance.get<InvitationPreview>(ApiRoutes.invitations.by_token(token))).data, "Failed to load invitation.");

export const acceptInvitationByToken = (token: string) =>
    withApiError(async () => (await axiosInstance.post<AcceptInvitationResult>(ApiRoutes.invitations.accept_token(token))).data, "Failed to accept invitation.");

export const acceptInvitation = (id: string) =>
    withApiError(async () => (await axiosInstance.post<AcceptInvitationResult>(ApiRoutes.invitations.accept(id))).data, "Failed to accept invitation.");

export const declineInvitation = (id: string) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.invitations.decline(id))).data, "Failed to decline invitation.");
