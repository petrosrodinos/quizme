import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { InviteMemberDto, MembersResponse, PendingInvitation, UpdateMemberDto } from "../interfaces/collaboration.interfaces";
import { tr } from "@/lib/i18n-options";

export const getMembers = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<MembersResponse>(ApiRoutes.collaboration.members(projectId))).data, tr("members:errors.loadMembers"));

export const inviteMember = ({ projectId, dto }: { projectId: string; dto: InviteMemberDto }) =>
    withApiError(async () => (await axiosInstance.post<PendingInvitation>(ApiRoutes.collaboration.invite(projectId), dto)).data, tr("members:errors.sendInvitation"));

export const revokeInvitation = ({ projectId, invitationId }: { projectId: string; invitationId: string }) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.collaboration.project_invitation(projectId, invitationId))).data, tr("members:errors.revokeInvitation"));

export const updateMember = ({ projectId, userId, dto }: { projectId: string; userId: string; dto: UpdateMemberDto }) =>
    withApiError(async () => (await axiosInstance.patch(ApiRoutes.collaboration.member(projectId, userId), dto)).data, tr("members:errors.updateMember"));

export const removeMember = ({ projectId, userId }: { projectId: string; userId: string }) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.collaboration.member(projectId, userId))).data, tr("members:errors.removeMember"));
