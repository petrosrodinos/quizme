import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { AiStatus, AiUsage } from "../interfaces/ai.interfaces";

export const getAiStatus = () => withApiError(async () => (await axiosInstance.get<AiStatus>(ApiRoutes.ai.status)).data, "Failed to load AI status.");
export const getAiUsage = () => withApiError(async () => (await axiosInstance.get<AiUsage>(ApiRoutes.ai.usage)).data, "Failed to load AI usage.");
