import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { ChatMode, ChatThread, SendMessageDto, SendMessageResult, ThreadMessages } from "../interfaces/tutor.interfaces";
import { tr } from "@/lib/i18n-options";

export const getThreads = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<ChatThread[]>(ApiRoutes.tutor.threads(projectId))).data, tr("tutor:errors.loadThreads"));

export const createThread = ({ projectId, mode, title }: { projectId: string; mode: ChatMode; title?: string }) =>
    withApiError(async () => (await axiosInstance.post<ChatThread>(ApiRoutes.tutor.threads(projectId), { mode, title })).data, tr("tutor:errors.createThread"));

export const updateThread = ({ id, mode, title }: { id: string; mode?: ChatMode; title?: string }) =>
    withApiError(async () => (await axiosInstance.patch<ChatThread>(ApiRoutes.tutor.thread(id), { mode, title })).data, tr("tutor:errors.updateThread"));

export const deleteThread = (id: string) => withApiError(async () => (await axiosInstance.delete(ApiRoutes.tutor.thread(id))).data, tr("tutor:errors.deleteThread"));

export const getMessages = (id: string) =>
    withApiError(async () => (await axiosInstance.get<ThreadMessages>(ApiRoutes.tutor.messages(id))).data, tr("tutor:errors.loadMessages"));

export const sendMessage = ({ threadId, dto }: { threadId: string; dto: SendMessageDto }) =>
    withApiError(async () => (await axiosInstance.post<SendMessageResult>(ApiRoutes.tutor.messages(threadId), dto)).data, tr("tutor:errors.send"));
