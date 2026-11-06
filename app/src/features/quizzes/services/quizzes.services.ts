import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type {
    AnswerResult,
    AttemptDetail,
    AttemptHistoryQuery,
    AttemptHistoryRow,
    AttemptSummary,
    CreateQuizDto,
    DocumentOption,
    GroupResults,
    Quiz,
    ReviewOverview,
    SubmitAnswerDto,
} from "../interfaces/quizzes.interfaces";

export const getQuizzes = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Quiz[]>(ApiRoutes.quizzes.by_project(projectId))).data, "Failed to load quizzes.");

export const getQuiz = (id: string) =>
    withApiError(async () => (await axiosInstance.get<Quiz>(ApiRoutes.quizzes.detail(id))).data, "Failed to load quiz.");

export const createQuiz = (projectId: string, dto: CreateQuizDto) =>
    withApiError(async () => (await axiosInstance.post<Quiz>(ApiRoutes.quizzes.by_project(projectId), dto)).data, "Failed to create quiz.");

export const deleteQuiz = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.quizzes.detail(id))).data, "Failed to delete quiz.");

export const shareQuiz = (id: string) =>
    withApiError(async () => (await axiosInstance.post<Quiz>(ApiRoutes.quizzes.share(id))).data, "Failed to share quiz.");

export const getQuizResults = (id: string) =>
    withApiError(async () => (await axiosInstance.get<GroupResults>(ApiRoutes.quizzes.results(id))).data, "Failed to load group results.");

export const getReviewOverview = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<ReviewOverview>(ApiRoutes.quizzes.review(projectId))).data, "Failed to load review overview.");

export const getProjectDocumentOptions = (projectId: string) =>
    withApiError(
        async () => (await axiosInstance.get<DocumentOption[]>(ApiRoutes.quizzes.project_documents(projectId))).data,
        "Failed to load documents.",
    );

export const startAttempt = (quizId: string) =>
    withApiError(async () => (await axiosInstance.post<AttemptDetail>(ApiRoutes.quizzes.start_attempt(quizId))).data, "Failed to start quiz.");

export const getAttempt = (id: string) =>
    withApiError(async () => (await axiosInstance.get<AttemptDetail>(ApiRoutes.attempts.detail(id))).data, "Failed to load attempt.");

export const submitAnswer = (attemptId: string, dto: SubmitAnswerDto) =>
    withApiError(async () => (await axiosInstance.post<AnswerResult>(ApiRoutes.attempts.answers(attemptId), dto)).data, "Failed to submit answer.");

export const completeAttempt = (attemptId: string) =>
    withApiError(async () => (await axiosInstance.post<AttemptSummary>(ApiRoutes.attempts.complete(attemptId))).data, "Failed to submit quiz.");

export const getAttemptSummary = (attemptId: string) =>
    withApiError(async () => (await axiosInstance.get<AttemptSummary>(ApiRoutes.attempts.summary(attemptId))).data, "Failed to load results.");

export const getAttemptHistory = (projectId: string, query?: AttemptHistoryQuery) =>
    withApiError(
        async () => (await axiosInstance.get<AttemptHistoryRow[]>(ApiRoutes.attempts.by_project(projectId), { params: query })).data,
        "Failed to load attempt history.",
    );
