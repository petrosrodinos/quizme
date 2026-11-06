import { useQuery } from "@tanstack/react-query";
import { getAiStatus, getAiUsage } from "../services/ai.services";

export const useAiStatus = () => useQuery({ queryKey: ["ai-status"], queryFn: getAiStatus, staleTime: 5 * 60_000 });
export const useAiUsage = () => useQuery({ queryKey: ["ai-usage"], queryFn: getAiUsage, staleTime: 60_000 });
