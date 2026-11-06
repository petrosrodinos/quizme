import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AddOrgMemberDto, Organization, OrganizationMember } from "../interfaces/organizations.interfaces";

export const getOrganizations = () =>
    withApiError(async () => (await axiosInstance.get<Organization[]>(ApiRoutes.organizations.prefix)).data, "Failed to load organizations.");

export const createOrganization = (name: string) =>
    withApiError(async () => (await axiosInstance.post<Organization>(ApiRoutes.organizations.prefix, { name })).data, "Failed to create organization.");

export const getOrganizationMembers = (id: string) =>
    withApiError(async () => (await axiosInstance.get<OrganizationMember[]>(ApiRoutes.organizations.members(id))).data, "Failed to load organization members.");

export const addOrganizationMember = ({ id, dto }: { id: string; dto: AddOrgMemberDto }) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.organizations.members(id), dto)).data, "Failed to add member.");

export const removeOrganizationMember = ({ id, userId }: { id: string; userId: string }) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.organizations.member(id, userId))).data, "Failed to remove member.");
