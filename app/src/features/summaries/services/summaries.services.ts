import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateSummaryDto, Summary } from "../interfaces/summaries.interfaces";
import { tr } from "@/lib/i18n-options";

export const getSummaries = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Summary[]>(ApiRoutes.summaries.by_project(projectId))).data, tr("summaries:errors.loadAll"));

export const getSummary = (id: string) => withApiError(async () => (await axiosInstance.get<Summary>(ApiRoutes.summaries.detail(id))).data, tr("summaries:errors.load"));

export const createSummary = ({ projectId, dto }: { projectId: string; dto: CreateSummaryDto }) =>
    withApiError(async () => (await axiosInstance.post<Summary>(ApiRoutes.summaries.by_project(projectId), dto)).data, tr("summaries:errors.generate"));

export const deleteSummary = (id: string) => withApiError(async () => (await axiosInstance.delete(ApiRoutes.summaries.detail(id))).data, tr("summaries:errors.delete"));
