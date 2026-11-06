import { type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import type { AchievementUnlockedEvent, LevelUpEvent, XpGainedEvent } from "@/features/gamification/interfaces/gamification.interfaces";
import { useFeedback } from "@/hooks/use-feedback";
import { usePreferencesStore } from "@/stores/preferences";
import { CelebrationKinds, useCelebrationsStore } from "@/stores/celebrations";
import { toast } from "@/hooks/use-toast";
import { CelebrationModal } from "@/components/ui/celebration-modal";
import { XpPopupLayer } from "@/components/ui/xp-popup";
import { tr } from "@/lib/i18n-options";
import { getLevelTitleLabel } from "@/config/constants/dropdowns/gamification/level-title.options";
import { getAchievementText } from "@/config/constants/dropdowns/gamification/achievement-text.options";

const MAJOR_RARITIES = new Set(["RARE", "EPIC", "LEGENDARY"]);

/**
 * Turns server-pushed gamification events into UI moments: XP popups, level-up and achievement
 * celebrations, sounds and query refreshes. Everything is suppressed in Focus Mode / exam mode
 * (progress is still tracked silently server-side).
 */
export const GamificationEventsProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();
    const { play, haptic, showXp } = useFeedback();
    const push = useCelebrationsStore((s) => s.push);

    const quiet = () => {
        const p = usePreferencesStore.getState();
        return p.focus_mode || p.exam_mode;
    };

    useRealtimeEvent<XpGainedEvent>(RealtimeEvents.XP_GAINED, (e) => {
        queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
        if (quiet()) return;
        showXp(e.amount);
        play("xp");
    });

    useRealtimeEvent<LevelUpEvent>(RealtimeEvents.LEVEL_UP, (e) => {
        queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
        if (quiet()) return;
        push({ kind: CelebrationKinds.LEVEL_UP, title: tr("ui:celebration.levelTitle", { level: e.level }), description: tr("ui:celebration.levelDescription", { title: getLevelTitleLabel(e.level_title) }), level: e.level });
        play("levelUp");
        haptic("celebrate");
    });

    useRealtimeEvent<AchievementUnlockedEvent>(RealtimeEvents.ACHIEVEMENT_UNLOCKED, (e) => {
        queryClient.invalidateQueries({ queryKey: ["achievements"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        const prefs = usePreferencesStore.getState();
        if (quiet() || !prefs.achievement_popups) return;
        play("achievement");
        const text = getAchievementText(e);
        if (MAJOR_RARITIES.has(e.rarity)) {
            push({ kind: CelebrationKinds.ACHIEVEMENT, title: text.title, description: text.description, icon: e.icon, rarity: e.rarity });
        } else {
            toast({ title: tr("ui:celebration.achievementToast", { title: text.title }), description: text.description, duration: 4000 });
        }
    });

    useRealtimeEvent(RealtimeEvents.STREAK_UPDATED, () => {
        queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
    });

    useRealtimeEvent(RealtimeEvents.DAILY_GOAL_MET, () => {
        queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
        if (quiet()) return;
        push({ kind: CelebrationKinds.DAILY_GOAL, title: tr("ui:celebration.goalTitle"), description: tr("ui:celebration.goalDescription") });
        play("goal");
    });

    useRealtimeEvent<{ title?: string; body?: string; type?: string }>(RealtimeEvents.NOTIFICATION, (n) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        // Achievements, goals and quiz results already have dedicated celebrations/screens — avoid duplicate toasts.
        const celebrated = ["achievement", "goal", "quiz_completed"];
        if (n?.title && !quiet() && !celebrated.includes(n.type ?? "")) toast({ title: n.title, description: n.body, duration: 4000, variant: "default" });
    });

    return (
        <>
            {children}
            <XpPopupLayer />
            <CelebrationModal />
        </>
    );
};
