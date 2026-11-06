import { tr } from "@/lib/i18n-options";
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
    withApiError(async () => (await axiosInstance.get<Quiz[]>(ApiRoutes.quizzes.by_project(projectId))).data, tr("quizzes:errors.loadList"));

export const getQuiz = (id: string) =>
    withApiError(async () => (await axiosInstance.get<Quiz>(ApiRoutes.quizzes.detail(id))).data, tr("quizzes:errors.load"));

export const createQuiz = (projectId: string, dto: CreateQuizDto) =>
    withApiError(async () => (await axiosInstance.post<Quiz>(ApiRoutes.quizzes.by_project(projectId), dto)).data, tr("quizzes:errors.create"));

export const deleteQuiz = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.quizzes.detail(id))).data, tr("quizzes:errors.delete"));

export const shareQuiz = (id: string) =>
    withApiError(async () => (await axiosInstance.post<Quiz>(ApiRoutes.quizzes.share(id))).data, tr("quizzes:errors.share"));

export const getQuizResults = (id: string) =>
    withApiError(async () => (await axiosInstance.get<GroupResults>(ApiRoutes.quizzes.results(id))).data, tr("quizzes:errors.groupResults"));

export const getReviewOverview = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<ReviewOverview>(ApiRoutes.quizzes.review(projectId))).data, tr("quizzes:errors.review"));

export const getProjectDocumentOptions = (projectId: string) =>
    withApiError(
        async () => (await axiosInstance.get<DocumentOption[]>(ApiRoutes.quizzes.project_documents(projectId))).data,
        tr("quizzes:errors.documents"),
    );

export const startAttempt = (quizId: string) =>
    withApiError(async () => (await axiosInstance.post<AttemptDetail>(ApiRoutes.quizzes.start_attempt(quizId))).data, tr("quizzes:errors.start"));

export const getAttempt = (id: string) =>
    withApiError(async () => (await axiosInstance.get<AttemptDetail>(ApiRoutes.attempts.detail(id))).data, tr("quizzes:errors.attempt"));

export const submitAnswer = (attemptId: string, dto: SubmitAnswerDto) =>
    withApiError(async () => (await axiosInstance.post<AnswerResult>(ApiRoutes.attempts.answers(attemptId), dto)).data, tr("quizzes:errors.answer"));

export const completeAttempt = (attemptId: string) =>
    withApiError(async () => (await axiosInstance.post<AttemptSummary>(ApiRoutes.attempts.complete(attemptId))).data, tr("quizzes:errors.submit"));

export const getAttemptSummary = (attemptId: string) =>
    withApiError(async () => (await axiosInstance.get<AttemptSummary>(ApiRoutes.attempts.summary(attemptId))).data, tr("quizzes:errors.results"));

export const getAttemptHistory = (projectId: string, query?: AttemptHistoryQuery) =>
    withApiError(
        async () => (await axiosInstance.get<AttemptHistoryRow[]>(ApiRoutes.attempts.by_project(projectId), { params: query })).data,
        tr("quizzes:errors.history"),
    );
