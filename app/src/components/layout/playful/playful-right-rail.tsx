import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Illo, Mascot } from "@/components/ui/mascot";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useGamificationProfile, useAchievements } from "@/features/gamification/hooks/use-gamification";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { Routes } from "@/routes/routes";
import { formatDate } from "@/lib/date";
import { getAchievementText } from "@/config/constants/dropdowns/gamification/achievement-text.options";
import { CourseSwitcher } from "./course-switcher";
import { CourseBadge } from "./course-badge";
import { PlayfulStats } from "./playful-stats";

const card = "rounded-2xl border-2 border-border p-5";
const heading = "text-lg font-extrabold";
const link = "text-sm font-extrabold uppercase tracking-wide text-[var(--pf-blue)] hover:opacity-80";

/** Daily goal "quest" card — shared by the right rail and the phone home screen. */
export const DailyGoalCard = ({ className }: { className?: string }) => {
    const { t } = useTranslation("playful");
    const { data } = useGamificationProfile();
    if (!data) return null;
    const goal = data.daily_goal;
    const done = Math.round(goal.progress_minutes);
    const pct = goal.met ? 100 : Math.min(100, Math.round((goal.progress_minutes / Math.max(1, goal.minutes)) * 100));
    return (
        <section className={`${card} ${className ?? ""}`} aria-labelledby="pf-daily-goal">
            <div className="mb-3 flex items-center justify-between">
                <h2 id="pf-daily-goal" className={heading}>
                    {t("home.dailyQuest")}
                </h2>
                <Link to={Routes.achievements} className={link}>
                    {t("rail.editGoal")}
                </Link>
            </div>
            <div className="flex items-center gap-4">
                <Illo name="chest" className="size-14 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="mb-2 text-[15px] font-bold">{goal.met ? t("rail.dailyGoalDone") : t("home.dailyQuestProgress", { done, goal: goal.minutes })}</p>
                    <Progress value={pct} aria-label={t("home.dailyQuest")} />
                </div>
            </div>
        </section>
    );
};

/** Desktop right column (xl+): stats, daily goal, exams, next achievement. */
export const PlayfulRightRail = () => {
    const { t } = useTranslation("playful");
    const { data: dashboard } = useDashboard();
    const { data: achievements } = useAchievements();
    const next = achievements?.filter((a) => !a.unlocked && !a.hidden).sort((a, b) => b.progress / Math.max(1, b.target) - a.progress / Math.max(1, a.target))[0];
    const exams = dashboard?.upcoming_exams ?? [];
    const nextText = next ? getAchievementText(next) : null;

    return (
        <aside className="sticky top-0 hidden h-dvh w-[340px] shrink-0 flex-col gap-5 overflow-y-auto py-6 scrollbar-none xl:flex">
            <div className="flex items-center justify-between">
                <CourseSwitcher />
                <PlayfulStats />
                <NotificationBell />
            </div>

            <DailyGoalCard />

            <section className={card} aria-labelledby="pf-exams">
                <h2 id="pf-exams" className={`${heading} mb-3`}>
                    {t("rail.examTitle")}
                </h2>
                {exams.length ? (
                    <ul className="space-y-3">
                        {exams.slice(0, 3).map((p) => (
                            <li key={p.id}>
                                <Link to={Routes.projects.exam(p.id)} className="flex items-center gap-3 rounded-xl hover:bg-muted">
                                    <CourseBadge id={p.id} title={p.title} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-extrabold">{p.title}</div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                                            <CalendarDays className="size-3.5" />
                                            {formatDate(p.exam_date)}
                                            {p.days_to_exam !== null && ` · ${t("home.examIn", { count: p.days_to_exam })}`}
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-[var(--pf-green)]">{p.readiness}%</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center gap-3">
                        <Mascot pose="sleep" className="size-14" />
                        <p className="text-sm font-bold text-muted-foreground">{t("rail.noExams")}</p>
                    </div>
                )}
            </section>

            {next && nextText && (
                <section className={card} aria-labelledby="pf-next-badge">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 id="pf-next-badge" className={heading}>
                            {t("rail.quests")}
                        </h2>
                        <Link to={Routes.achievements} className={link}>
                            {t("rail.viewAll")}
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Mascot pose="trophy" className="size-14 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-extrabold">{nextText.title}</div>
                            <p className="mb-2 line-clamp-2 text-xs font-bold text-muted-foreground">{nextText.description}</p>
                            <Progress value={(next.progress / Math.max(1, next.target)) * 100} aria-label={nextText.title} />
                        </div>
                    </div>
                </section>
            )}
        </aside>
    );
};
