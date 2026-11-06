import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AuthUser } from "@/features/auth/interfaces/auth.interface";
import type { UpdateProfileDto } from "../interfaces/account.interfaces";

export const updateProfile = (dto: UpdateProfileDto) =>
    withApiError(async () => (await axiosInstance.patch<AuthUser>(ApiRoutes.users.me, dto)).data, "Failed to update profile.");

export const deleteAccount = () =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.users.me, { data: { confirm: "DELETE" } })).data, "Failed to delete account.");
