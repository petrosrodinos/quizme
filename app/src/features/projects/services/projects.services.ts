import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateProjectDto, Project, ProjectOverview, ProjectQuery, UpdateProjectDto } from "../interfaces/projects.interfaces";

export const getProjects = (query: ProjectQuery) =>
    withApiError(async () => (await axiosInstance.get<Project[]>(ApiRoutes.projects.prefix, { params: query })).data, "Failed to load projects.");

export const getProject = (id: string) =>
    withApiError(async () => (await axiosInstance.get<Project>(ApiRoutes.projects.detail(id))).data, "Failed to load project.");

export const createProject = (dto: CreateProjectDto) =>
    withApiError(async () => (await axiosInstance.post<Project>(ApiRoutes.projects.prefix, dto)).data, "Failed to create project.");

export const updateProject = ({ id, dto }: { id: string; dto: UpdateProjectDto }) =>
    withApiError(async () => (await axiosInstance.patch<Project>(ApiRoutes.projects.detail(id), dto)).data, "Failed to update project.");

export const deleteProject = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.projects.detail(id))).data, "Failed to delete project.");

export const setProjectArchived = ({ id, archived }: { id: string; archived: boolean }) =>
    withApiError(
        async () => (await axiosInstance.post<Project>(archived ? ApiRoutes.projects.archive(id) : ApiRoutes.projects.unarchive(id))).data,
        archived ? "Failed to archive project." : "Failed to restore project.",
    );

export const duplicateProject = (id: string) =>
    withApiError(async () => (await axiosInstance.post<Project>(ApiRoutes.projects.duplicate(id))).data, "Failed to duplicate project.");

export const uploadProjectCover = ({ id, file }: { id: string; file: File }) =>
    withApiError(async () => {
        const form = new FormData();
        form.append("file", file);
        return (await axiosInstance.post<Project>(ApiRoutes.projects.cover(id), form, { headers: { "Content-Type": "multipart/form-data" } })).data;
    }, "Failed to upload cover image.");

export const getProjectOverview = (id: string) =>
    withApiError(async () => (await axiosInstance.get<ProjectOverview>(ApiRoutes.projects.overview(id))).data, "Failed to load project overview.");
