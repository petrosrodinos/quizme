import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { UpdatePreferencesDto, UserPreferences } from "../interfaces/preferences.interfaces";

export const getPreferences = () =>
    withApiError(async () => (await axiosInstance.get<UserPreferences>(ApiRoutes.users.preferences)).data, "Failed to load preferences.");

export const updatePreferences = (dto: UpdatePreferencesDto) =>
    withApiError(async () => (await axiosInstance.patch<UserPreferences>(ApiRoutes.users.preferences, dto)).data, "Failed to save preferences.");
