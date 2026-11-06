import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateTopicDto, TopicNode, UpdateTopicDto } from "../interfaces/topics.interfaces";

export const getTopicTree = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<TopicNode[]>(ApiRoutes.topics.by_project(projectId))).data, "Failed to load topics.");

export const rebuildTopics = (projectId: string) =>
    withApiError(async () => (await axiosInstance.post<{ job_id: string }>(ApiRoutes.topics.rebuild(projectId))).data, "Failed to rebuild the knowledge map.");

export const createTopic = (projectId: string, dto: CreateTopicDto) =>
    withApiError(async () => (await axiosInstance.post(ApiRoutes.topics.by_project(projectId), dto)).data, "Failed to create topic.");

export const updateTopic = (id: string, dto: UpdateTopicDto) =>
    withApiError(async () => (await axiosInstance.patch(ApiRoutes.topics.detail(id), dto)).data, "Failed to update topic.");

export const deleteTopic = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.topics.detail(id))).data, "Failed to delete topic.");
