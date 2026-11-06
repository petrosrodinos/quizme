import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { DocumentContentPage, StudyDocument, UploadResult } from "../interfaces/documents.interfaces";

export const getDocuments = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<StudyDocument[]>(ApiRoutes.documents.list(projectId))).data, "Failed to load documents.");

export const getDocument = (id: string) =>
    withApiError(async () => (await axiosInstance.get<StudyDocument>(ApiRoutes.documents.detail(id))).data, "Failed to load document.");

export const getDocumentContent = (id: string, page: number, limit = 30) =>
    withApiError(
        async () => (await axiosInstance.get<DocumentContentPage>(ApiRoutes.documents.content(id), { params: { page, limit } })).data,
        "Failed to load document content.",
    );

export const uploadDocuments = ({ projectId, files, onProgress }: { projectId: string; files: File[]; onProgress?: (pct: number) => void }) =>
    withApiError(async () => {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        const res = await axiosInstance.post<{ results: UploadResult[] }>(ApiRoutes.documents.list(projectId), form, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 10 * 60_000,
            onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
        });
        return res.data;
    }, "Failed to upload documents.");

export const getDocumentDownloadUrl = (id: string) =>
    withApiError(async () => (await axiosInstance.get<{ url: string }>(ApiRoutes.documents.download(id))).data, "Failed to prepare download.");

export const reprocessDocument = (id: string) =>
    withApiError(async () => (await axiosInstance.post<StudyDocument>(ApiRoutes.documents.reprocess(id))).data, "Failed to reprocess document.");

export const deleteDocument = (id: string) =>
    withApiError(async () => (await axiosInstance.delete(ApiRoutes.documents.detail(id))).data, "Failed to delete document.");
