import type { FC } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SessionBlockTypeOptions } from "@/config/constants/dropdowns/study/session-block-type.options";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Routes } from "@/routes/routes";
import type { Dashboard } from "@/features/dashboard/interfaces/dashboard.interfaces";

interface TodayCardProps {
    data: Dashboard;
}

/** Hero card: today's goal ring, the first steps of the recommended session and the main CTA. */
export const TodayCard: FC<TodayCardProps> = ({ data }) => {
    const { t } = useTranslation("dashboard");
    const { session, goal_progress, minutes } = data.today;
    const goal = data.gamification.daily_goal;
    const weakCount = data.weak_topics.length;
    return (
        <section aria-labelledby="today-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <ProgressRing value={goal_progress} size={132} strokeWidth={10} label={t("today.goalLabel")} indicatorClassName={goal.met ? "stroke-success" : undefined}>
                    <span className="font-display text-3xl">{goal_progress}%</span>
                    <span className="text-xs text-muted-foreground">
                        {t("today.minutesOf", { minutes, goal: goal.minutes })}
                    </span>
                </ProgressRing>
                <div className="min-w-0 flex-1 space-y-3">
                    <div>
                        <h2 id="today-heading" className="font-display text-2xl">
                            {t("today.title")}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {session.completed
                                ? t("today.completed")
                                : session.blocks.length
                                  ? session.focus_project
                                      ? t("today.recommendedFocus", { count: session.total_minutes, project: session.focus_project.title })
                                      : t("today.recommended", { count: session.total_minutes })
                                  : t("today.empty")}
                        </p>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                        {weakCount > 0 && <li className="text-foreground">{t("today.topicsNeedReview", { count: weakCount })}</li>}
                        {data.flashcards_due > 0 && <li className="text-foreground">{t("today.flashcardsDue", { count: data.flashcards_due })}</li>}
                        {session.blocks.slice(0, 3).map((b, i) => (
                            <li key={`${b.type}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                                <span className="inline-block min-w-14 shrink-0 whitespace-nowrap font-medium text-foreground">{t("common:units.min", { count: b.minutes })}</span>
                                <span className="truncate">{SessionBlockTypeOptions.find((o) => o.id === b.type)?.label ?? b.title}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button asChild size="lg">
                            <Link to={Routes.study}>
                                {session.completed ? t("today.keepStudying") : t("today.continue")} <ArrowRight />
                            </Link>
                        </Button>
                        {goal.met && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-success">
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> {t("today.goalMet")}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
