import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AddOrgMemberDto, Organization, OrganizationMember } from "../interfaces/organizations.interfaces";
import { tr } from "@/lib/i18n-options";

export const getOrganizations = () =>
    withApiError(async () => (await axiosInstance.get<Organization[]>(ApiRoutes.organizations.prefix)).data, tr("members:orgs.errors.load"));

export const createOrganization = (name: string) =>
    withApiError(async () => (await axiosInstance.post<Organization>(ApiRoutes.organizations.prefix, { name })).data, tr("members:orgs.errors.create"));

export const getOrganizationMembers = (id: string) =>
    withApiError(async () => (await axiosInstance.get<OrganizationMember[]>(ApiRoutes.organizations.members(id))).data, tr("members:orgs.errors.loadMembers"));

export const addOrganizationMember = ({ id, dto }: { id: string; dto: AddOrgMemberDto }) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.organizations.members(id), dto)).data, tr("members:orgs.errors.addMember"));

export const removeOrganizationMember = ({ id, userId }: { id: string; userId: string }) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.organizations.member(id, userId))).data, tr("members:orgs.errors.removeMember"));
