import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type {
    CopySharedResult,
    CreateShareDto,
    CreateShareResult,
    Share,
    ShareableResource,
    ShareResourceType,
    SharedView,
    SharedWithMeItem,
} from "../interfaces/shares.interfaces";

export const getShares = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Share[]>(ApiRoutes.shares.by_project(projectId))).data, "Failed to load shares.");

export const createShare = ({ projectId, dto }: { projectId: string; dto: CreateShareDto }) =>
    withApiError(async () => (await axiosInstance.post<CreateShareResult>(ApiRoutes.shares.by_project(projectId), dto)).data, "Failed to share.");

export const revokeShare = (id: string) => withApiError(async () => (await axiosInstance.delete(ApiRoutes.shares.detail(id))).data, "Failed to revoke share.");

export const getSharedWithMe = () =>
    withApiError(async () => (await axiosInstance.get<SharedWithMeItem[]>(ApiRoutes.shares.shared_with_me)).data, "Failed to load shared content.");

export const getSharedView = (by: { token?: string; id?: string }) =>
    withApiError(
        async () => (await axiosInstance.get<SharedView>(by.token ? ApiRoutes.shares.link(by.token) : ApiRoutes.shares.by_id(by.id!))).data,
        "This shared content is not available.",
    );

export const joinSharedProject = (token: string) =>
    withApiError(async () => (await axiosInstance.post<{ project_id: string }>(ApiRoutes.shares.link_join(token))).data, "Failed to join project.");

export const copyShared = ({ token, id, targetProjectId }: { token?: string; id?: string; targetProjectId?: string }) =>
    withApiError(
        async () =>
            (await axiosInstance.post<CopySharedResult>(token ? ApiRoutes.shares.link_copy(token) : ApiRoutes.shares.by_id_copy(id!), { target_project_id: targetProjectId })).data,
        "Failed to copy.",
    );

/** Loads candidate resources of a type for the share picker (API-derived options). */
export const getShareableResources = (projectId: string, type: ShareResourceType) =>
    withApiError(async (): Promise<ShareableResource[]> => {
        switch (type) {
            case "DOCUMENT": {
                const data = (await axiosInstance.get<{ id: string; filename: string }[]>(ApiRoutes.shares.documents(projectId))).data;
                return data.map((d) => ({ id: d.id, label: d.filename }));
            }
            case "DECK": {
                const data = (await axiosInstance.get<{ id: string; name: string; card_count?: number }[]>(ApiRoutes.shares.decks(projectId))).data;
                return data.map((d) => ({ id: d.id, label: d.card_count !== undefined ? `${d.name} (${d.card_count})` : d.name }));
            }
            case "QUIZ": {
                const data = (await axiosInstance.get<{ id: string; title: string; status: string }[]>(ApiRoutes.shares.quizzes(projectId))).data;
                return data.filter((q) => q.status === "READY").map((q) => ({ id: q.id, label: q.title }));
            }
            case "NOTE": {
                const raw = (await axiosInstance.get<unknown>(ApiRoutes.shares.notes(projectId), { params: { scope: "mine" } })).data;
                const data = (Array.isArray(raw) ? raw : ((raw as { data?: unknown[] })?.data ?? [])) as { id: string; title: string | null; content: string; type: string }[];
                return data.map((n) => ({ id: n.id, label: n.title || n.content.slice(0, 60) || n.type.toLowerCase() }));
            }
            default:
                return [];
        }
    }, "Failed to load items to share.");
