import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateQuestionDto, Question, QuestionListResponse, QuestionQuery, UpdateQuestionDto } from "../interfaces/questions.interfaces";

export const getQuestions = (projectId: string, query: QuestionQuery) =>
    withApiError(
        async () =>
            (
                await axiosInstance.get<QuestionListResponse>(ApiRoutes.questions.by_project(projectId), {
                    params: { ...query, missed: query.missed ? "true" : undefined },
                })
            ).data,
        "Failed to load questions.",
    );

export const getQuestion = (id: string) =>
    withApiError(async () => (await axiosInstance.get<Question>(ApiRoutes.questions.detail(id))).data, "Failed to load question.");

export const createQuestion = (projectId: string, dto: CreateQuestionDto) =>
    withApiError(async () => (await axiosInstance.post<Question>(ApiRoutes.questions.by_project(projectId), dto)).data, "Failed to create question.");

export const updateQuestion = (id: string, dto: UpdateQuestionDto) =>
    withApiError(async () => (await axiosInstance.patch<Question>(ApiRoutes.questions.detail(id), dto)).data, "Failed to update question.");

export const deleteQuestion = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.questions.detail(id))).data, "Failed to delete question.");

export const restoreQuestionVersion = (id: string, version: number) =>
    withApiError(async () => (await axiosInstance.post<Question>(ApiRoutes.questions.restore_version(id, version))).data, "Failed to restore version.");
