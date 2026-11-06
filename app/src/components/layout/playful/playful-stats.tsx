import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Illo } from "@/components/ui/mascot";
import { Skeleton } from "@/components/ui/skeleton";
import { useGamificationProfile } from "@/features/gamification/hooks/use-gamification";
import { getLevelTitleLabel } from "@/config/constants/dropdowns/gamification/level-title.options";
import { formatCompact } from "@/lib/format";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";

const chip = "inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-[15px] font-extrabold tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Streak flame + XP gem + level chips (Duolingo-style top bar). Each opens a small detail popover. */
export const PlayfulStats = ({ className }: { className?: string }) => {
    const { t } = useTranslation("playful");
    const { data, isPending } = useGamificationProfile();

    if (isPending) return <Skeleton className={cn("h-9 w-40 rounded-xl", className)} />;
    if (!data) return null;
    const streakAlive = data.current_streak > 0;

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <Popover>
                <PopoverTrigger className={cn(chip, streakAlive ? "text-[var(--pf-orange)]" : "text-muted-foreground")} aria-label={t("stats.streak", { count: data.current_streak })}>
                    <Illo name="flame" className={cn("size-7", !streakAlive && "opacity-40 grayscale")} />
                    {data.current_streak}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 rounded-2xl border-2 p-4">
                    <div className="flex items-center gap-3">
                        <Illo name="flame" className="size-14" />
                        <div>
                            <div className="text-lg font-extrabold">{t("stats.streak", { count: data.current_streak })}</div>
                            <div className="text-sm text-muted-foreground">{t("stats.bestStreak", { count: data.longest_streak })}</div>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{t("rail.streakCta")}</p>
                    {data.streak_freezes > 0 && (
                        <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[var(--pf-blue)]">
                            <Snowflake className="size-4" /> {t("stats.freezes", { count: data.streak_freezes })}
                        </p>
                    )}
                </PopoverContent>
            </Popover>

            <Link to={Routes.achievements} className={cn(chip, "text-[var(--pf-blue)]")} aria-label={t("stats.xp", { count: data.total_xp })}>
                <Illo name="gem" className="size-6" />
                {formatCompact(data.total_xp)}
            </Link>

            <Link
                to={Routes.profile}
                className={cn(chip, "text-[var(--pf-purple)]")}
                aria-label={`${t("stats.level", { level: data.level })} · ${getLevelTitleLabel(data.level_title)}`}
            >
                <span className="grid size-7 place-items-center rounded-lg bg-[var(--pf-purple)] text-xs font-black text-white shadow-[0_2px_0_0_var(--pf-purple-ridge)]">{data.level}</span>
            </Link>
        </div>
    );
};
