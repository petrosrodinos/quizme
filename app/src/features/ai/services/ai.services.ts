import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AiStatus, AiUsage } from "../interfaces/ai.interfaces";
import { tr } from "@/lib/i18n-options";

export const getAiStatus = () => withApiError(async () => (await axiosInstance.get<AiStatus>(ApiRoutes.ai.status)).data, tr("settings:errors.aiStatus"));
export const getAiUsage = () => withApiError(async () => (await axiosInstance.get<AiUsage>(ApiRoutes.ai.usage)).data, tr("settings:errors.aiUsage"));
