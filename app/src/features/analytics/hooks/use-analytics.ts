import { useQuery } from "@tanstack/react-query";
import { getProjectProgress, getStudyPlan } from "../services/analytics.services";

export const useProjectProgress = (projectId: string) =>
    useQuery({ queryKey: ["project-progress", projectId], queryFn: () => getProjectProgress(projectId), enabled: !!projectId, staleTime: 30_000 });

export const useStudyPlan = (projectId: string) =>
    useQuery({ queryKey: ["study-plan", projectId], queryFn: () => getStudyPlan(projectId), enabled: !!projectId, staleTime: 30_000 });
