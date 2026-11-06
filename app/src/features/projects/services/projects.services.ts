import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateProjectDto, Project, ProjectLanguage, ProjectOverview, ProjectQuery, UpdateProjectDto } from "../interfaces/projects.interfaces";
import { tr } from "@/lib/i18n-options";

export const getProjects = (query: ProjectQuery) =>
    withApiError(async () => (await axiosInstance.get<Project[]>(ApiRoutes.projects.prefix, { params: query })).data, tr("projects:errors.loadList"));

export const getProjectLanguages = () =>
    withApiError(async () => (await axiosInstance.get<ProjectLanguage[]>(ApiRoutes.projects.languages)).data, tr("projects:errors.loadLanguages"));

export const getProject = (id: string) =>
    withApiError(async () => (await axiosInstance.get<Project>(ApiRoutes.projects.detail(id))).data, tr("projects:errors.load"));

export const createProject = (dto: CreateProjectDto) =>
    withApiError(async () => (await axiosInstance.post<Project>(ApiRoutes.projects.prefix, dto)).data, tr("projects:errors.create"));

export const updateProject = ({ id, dto }: { id: string; dto: UpdateProjectDto }) =>
    withApiError(async () => (await axiosInstance.patch<Project>(ApiRoutes.projects.detail(id), dto)).data, tr("projects:errors.update"));

export const deleteProject = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.projects.detail(id))).data, tr("projects:errors.delete"));

export const setProjectArchived = ({ id, archived }: { id: string; archived: boolean }) =>
    withApiError(
        async () => (await axiosInstance.post<Project>(archived ? ApiRoutes.projects.archive(id) : ApiRoutes.projects.unarchive(id))).data,
        archived ? tr("projects:errors.archive") : tr("projects:errors.restore"),
    );

export const duplicateProject = (id: string) =>
    withApiError(async () => (await axiosInstance.post<Project>(ApiRoutes.projects.duplicate(id))).data, tr("projects:errors.duplicate"));

export const uploadProjectCover = ({ id, file }: { id: string; file: File }) =>
    withApiError(async () => {
        const form = new FormData();
        form.append("file", file);
        return (await axiosInstance.post<Project>(ApiRoutes.projects.cover(id), form, { headers: { "Content-Type": "multipart/form-data" } })).data;
    }, tr("projects:errors.cover"));

export const getProjectOverview = (id: string) =>
    withApiError(async () => (await axiosInstance.get<ProjectOverview>(ApiRoutes.projects.overview(id))).data, tr("projects:errors.overview"));
