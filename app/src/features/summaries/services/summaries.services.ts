import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateSummaryDto, Summary } from "../interfaces/summaries.interfaces";

export const getSummaries = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Summary[]>(ApiRoutes.summaries.by_project(projectId))).data, "Failed to load summaries.");

export const getSummary = (id: string) => withApiError(async () => (await axiosInstance.get<Summary>(ApiRoutes.summaries.detail(id))).data, "Failed to load summary.");

export const createSummary = ({ projectId, dto }: { projectId: string; dto: CreateSummaryDto }) =>
    withApiError(async () => (await axiosInstance.post<Summary>(ApiRoutes.summaries.by_project(projectId), dto)).data, "Failed to generate summary.");

export const deleteSummary = (id: string) => withApiError(async () => (await axiosInstance.delete(ApiRoutes.summaries.detail(id))).data, "Failed to delete summary.");
