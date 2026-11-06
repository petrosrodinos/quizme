import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { ProjectHeader } from "../interfaces/project-header.interfaces";

export const getProjectHeader = (id: string) =>
    withApiError(async () => (await axiosInstance.get<ProjectHeader>(ApiRoutes.projects.detail(id))).data, "Failed to load project.");
