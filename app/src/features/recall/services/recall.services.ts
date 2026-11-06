import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { EvaluateRecallDto, RecallAttempt, RecallMode, RecallPrompt, RecallResult } from "../interfaces/recall.interfaces";
import { tr } from "@/lib/i18n-options";

export const getRecallPrompts = (projectId: string, params: { mode: RecallMode; topic_id?: string; count?: number }) =>
    withApiError(async () => (await axiosInstance.get<RecallPrompt[]>(ApiRoutes.recall.prompts(projectId), { params })).data, tr("recall:errors.prompts"));

export const evaluateRecall = ({ projectId, dto }: { projectId: string; dto: EvaluateRecallDto }) =>
    withApiError(async () => (await axiosInstance.post<RecallResult>(ApiRoutes.recall.evaluate(projectId), dto)).data, tr("recall:errors.evaluate"));

export const getRecallHistory = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<RecallAttempt[]>(ApiRoutes.recall.history(projectId))).data, tr("recall:errors.history"));
