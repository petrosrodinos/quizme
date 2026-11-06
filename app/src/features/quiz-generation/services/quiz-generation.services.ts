import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";

export const QuickQuizModes = {
    SELECTION: "SELECTION",
    ADAPTIVE: "ADAPTIVE",
} as const;
export type QuickQuizMode = (typeof QuickQuizModes)[keyof typeof QuickQuizModes];

export interface QuickQuizDto {
    mode: QuickQuizMode;
    count?: number;
    selection_text?: string;
    selection_document_id?: string;
}

export const createQuickQuiz = ({ projectId, dto }: { projectId: string; dto: QuickQuizDto }) =>
    withApiError(
        async () => (await axiosInstance.post<{ id: string; status: string }>(ApiRoutes.quiz_creation.create(projectId), dto)).data,
        "Failed to create quiz.",
    );
