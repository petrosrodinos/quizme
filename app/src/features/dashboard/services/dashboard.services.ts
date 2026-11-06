import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { Dashboard } from "../interfaces/dashboard.interfaces";

export const getDashboard = () => withApiError(async () => (await axiosInstance.get<Dashboard>(ApiRoutes.dashboard.prefix)).data, "Failed to load your dashboard.");
