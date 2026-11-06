import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { Achievement, ActivityDay, GamificationProfile, Leaderboard, UpdateDailyGoalDto } from "../interfaces/gamification.interfaces";
import { tr } from "@/lib/i18n-options";

export const getGamificationProfile = () =>
    withApiError(async () => (await axiosInstance.get<GamificationProfile>(ApiRoutes.gamification.profile)).data, tr("gamification:errors.profile"));

export const getAchievements = () =>
    withApiError(async () => (await axiosInstance.get<Achievement[]>(ApiRoutes.gamification.achievements)).data, tr("gamification:errors.achievements"));

export const getActivity = (days: number) =>
    withApiError(async () => (await axiosInstance.get<ActivityDay[]>(ApiRoutes.gamification.activity, { params: { days } })).data, tr("gamification:errors.activity"));

export const updateDailyGoal = (dto: UpdateDailyGoalDto) =>
    withApiError(async () => (await axiosInstance.patch<GamificationProfile>(ApiRoutes.gamification.daily_goal, dto)).data, tr("gamification:errors.dailyGoal"));

export const getLeaderboard = (projectId: string) =>
    withApiError(async () => (await axiosInstance.get<Leaderboard>(ApiRoutes.gamification.leaderboard(projectId))).data, tr("gamification:errors.leaderboard"));
