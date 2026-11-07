import { tr } from "@/lib/i18n-options";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { Curriculum, CurriculumFormDto, LessonDetail, LessonItemType, ReorderPayload } from "../interfaces/curriculum.interfaces";

const r = ApiRoutes.curriculum;

export const getCurriculum = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Curriculum>(r.tree(projectId))).data, tr("curriculum:errors.load"));

export const getLesson = (id: string) =>
    withApiError(async () => (await axiosInstance.get<LessonDetail>(r.lesson(id))).data, tr("curriculum:errors.loadLesson"));

export const createUnit = (projectId: string, dto: CurriculumFormDto) =>
    withApiError(async () => (await axiosInstance.post(r.units(projectId), dto)).data, tr("curriculum:errors.createUnit"));

export const updateUnit = (id: string, dto: Partial<CurriculumFormDto>) =>
    withApiError(async () => (await axiosInstance.patch(r.unit(id), dto)).data, tr("curriculum:errors.updateUnit"));

export const deleteUnit = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(r.unit(id))).data, tr("curriculum:errors.deleteUnit"));

export const createLesson = (unitId: string, dto: CurriculumFormDto) =>
    withApiError(async () => (await axiosInstance.post(r.lessons(unitId), dto)).data, tr("curriculum:errors.createLesson"));

export const updateLesson = (id: string, dto: Partial<CurriculumFormDto>) =>
    withApiError(async () => (await axiosInstance.patch(r.lesson(id), dto)).data, tr("curriculum:errors.updateLesson"));

export const deleteLesson = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(r.lesson(id))).data, tr("curriculum:errors.deleteLesson"));

export const reorderCurriculum = (projectId: string, payload: ReorderPayload) =>
    withApiError(async () => (await axiosInstance.put<Curriculum>(r.order(projectId), payload)).data, tr("curriculum:errors.reorder"));

export const assignItems = (lessonId: string, type: LessonItemType, ids: string[]) =>
    withApiError(async () => (await axiosInstance.patch(r.items(lessonId), { type, ids })).data, tr("curriculum:errors.assign"));

export const unassignItems = (projectId: string, type: LessonItemType, ids: string[]) =>
    withApiError(async () => (await axiosInstance.patch(r.unassign(projectId), { type, ids })).data, tr("curriculum:errors.assign"));
