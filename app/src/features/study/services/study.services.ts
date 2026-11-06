import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { DailySession, LogActivityDto } from "../interfaces/study.interfaces";
import { tr } from "@/lib/i18n-options";

export const getDailySession = (projectId?: string) =>
    withApiError(
        async () => (await axiosInstance.get<DailySession>(ApiRoutes.study.session, { params: projectId ? { project_id: projectId } : {} })).data,
        tr("study:errors.session"),
    );

export const completeDailySession = () =>
    withApiError(async () => (await axiosInstance.post<{ success: boolean }>(ApiRoutes.study.complete_session)).data, tr("study:errors.complete"));

export const logStudyActivity = (dto: LogActivityDto) =>
    withApiError(async () => (await axiosInstance.post<{ logged: number }>(ApiRoutes.study.activity, dto)).data, tr("study:errors.activity"));
