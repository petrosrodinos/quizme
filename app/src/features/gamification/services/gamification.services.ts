import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { Achievement, ActivityDay, GamificationProfile, Leaderboard, UpdateDailyGoalDto } from "../interfaces/gamification.interfaces";

export const getGamificationProfile = () =>
    withApiError(async () => (await axiosInstance.get<GamificationProfile>(ApiRoutes.gamification.profile)).data, "Failed to load progress.");

export const getAchievements = () =>
    withApiError(async () => (await axiosInstance.get<Achievement[]>(ApiRoutes.gamification.achievements)).data, "Failed to load achievements.");

export const getActivity = (days: number) =>
    withApiError(async () => (await axiosInstance.get<ActivityDay[]>(ApiRoutes.gamification.activity, { params: { days } })).data, "Failed to load activity.");

export const updateDailyGoal = (dto: UpdateDailyGoalDto) =>
    withApiError(async () => (await axiosInstance.patch<GamificationProfile>(ApiRoutes.gamification.daily_goal, dto)).data, "Failed to update daily goal.");

export const getLeaderboard = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Leaderboard>(ApiRoutes.gamification.leaderboard(projectId))).data, "Failed to load leaderboard.");
