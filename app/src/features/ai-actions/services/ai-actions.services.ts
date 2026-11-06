import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { TextActionDto, TextActionResult, WordLookupDto, WordLookupResult } from "../interfaces/ai-actions.interfaces";
import { tr } from "@/lib/i18n-options";

export const runTextAction = ({ projectId, dto }: { projectId: string; dto: TextActionDto }) =>
    withApiError(
        async () => (await axiosInstance.post<TextActionResult>(ApiRoutes.ai_actions.text_action(projectId), dto, { timeout: 120_000 })).data,
        tr("reader:errors.action"),
    );

export const lookupWord = ({ projectId, dto }: { projectId: string; dto: WordLookupDto }) =>
    withApiError(
        async () => (await axiosInstance.post<WordLookupResult>(ApiRoutes.ai_actions.word(projectId), dto, { timeout: 60_000 })).data,
        tr("reader:errors.word"),
    );
