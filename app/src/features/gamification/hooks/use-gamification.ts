import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { getAchievements, getActivity, getGamificationProfile, getLeaderboard, updateDailyGoal } from "../services/gamification.services";
import type { UpdateDailyGoalDto } from "../interfaces/gamification.interfaces";
import { tr } from "@/lib/i18n-options";

export const useGamificationProfile = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({
        queryKey: ["gamification-profile"],
        queryFn: getGamificationProfile,
        enabled: isLoggedIn,
        staleTime: 30_000,
        retry: 1,
    });
};

export const useAchievements = () => useQuery({ queryKey: ["achievements"], queryFn: getAchievements, staleTime: 30_000 });

export const useActivity = (days = 84) => useQuery({ queryKey: ["gamification-activity", days], queryFn: () => getActivity(days), staleTime: 60_000 });

export const useLeaderboard = (projectId: string | undefined, enabled = true) =>
    useQuery({ queryKey: ["leaderboard", projectId], queryFn: () => getLeaderboard(projectId!), enabled: !!projectId && enabled });

export const useUpdateDailyGoal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: UpdateDailyGoalDto) => updateDailyGoal(dto),
        onSuccess: (profile) => {
            queryClient.setQueryData(["gamification-profile"], profile);
            queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            toast({ title: tr("gamification:toasts.goalUpdated"), description: tr("gamification:toasts.goalMinutes", { count: profile.daily_goal.minutes }), duration: 2000 });
        },
        onError: (error: Error) => toast({ title: tr("gamification:toasts.goalFailed"), description: error.message, variant: "error" }),
    });
};
