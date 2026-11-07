import type { FC } from "react";
import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLevelTitleLabel } from "@/config/constants/dropdowns/gamification/level-title.options";
import { LevelBadge } from "@/components/ui/level-badge";
import { StreakFlame } from "@/components/ui/streak-flame";
import { XpProgressBar } from "@/components/ui/xp-progress-bar";
import { Routes } from "@/routes/routes";
import { formatNumber } from "@/lib/format";
import type { GamificationProfile } from "@/features/gamification/interfaces/gamification.interfaces";

/** Streak and level summary shown beside the hero card. */
export const ProgressSideCards: FC<{ profile: GamificationProfile }> = ({ profile }) => {
    const { t } = useTranslation("dashboard");
    return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Link to={Routes.achievements} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("side.streak")}</div>
            <div className="mt-2 flex items-center gap-3">
                <StreakFlame days={profile.current_streak} size="lg" showLabel />
                <div className="text-xs text-muted-foreground">{t("side.best", { count: profile.longest_streak })}</div>
            </div>
            {profile.streak_freezes > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-card px-2.5 py-1 text-xs text-muted-foreground">
                    <Snowflake className="h-3.5 w-3.5 text-teal" aria-hidden /> {t("side.freezes", { count: profile.streak_freezes })}
                </div>
            )}
        </Link>
        <Link to={Routes.achievements} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("common:terms.level")}</div>
                <div className="text-xs text-muted-foreground">{t("side.totalXp", { xp: formatNumber(profile.total_xp) })}</div>
            </div>
            <div className="mt-3 flex items-center gap-3">
                <LevelBadge level={profile.level} title={getLevelTitleLabel(profile.level_title)} />
            </div>
            <XpProgressBar className="mt-3" current={profile.xp_into_level} target={profile.xp_for_next_level} />
        </Link>
    </div>
    );
};
