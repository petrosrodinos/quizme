import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { ProjectProgress, StudyPlan } from "../interfaces/analytics.interfaces";

export const getProjectProgress = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<ProjectProgress>(ApiRoutes.analytics.progress(projectId))).data, "Failed to load progress.");

export const getStudyPlan = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<StudyPlan>(ApiRoutes.analytics.plan(projectId))).data, "Failed to load the study plan.");
