import type { FC } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Routes } from "@/routes/routes";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DashboardProject } from "@/features/dashboard/interfaces/dashboard.interfaces";

const examTone = (days: number | null) => (days === null ? "" : days <= 7 ? "text-warning" : "text-muted-foreground");

export const ActiveProjects: FC<{ projects: DashboardProject[] }> = ({ projects }) => {
    const { t } = useTranslation("dashboard");
    return (
    <section aria-labelledby="projects-heading">
        <div className="mb-3 flex items-baseline justify-between">
            <h2 id="projects-heading" className="font-display text-xl">
                {t("projects.title")}
            </h2>
            <Link to={Routes.projects.root} className="text-sm text-primary hover:underline">
                {t("projects.all")}
            </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
                <Link
                    key={p.id}
                    to={Routes.projects.detail(p.id)}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <div className="min-w-0">
                        <div className="truncate font-medium">{p.title}</div>
                        {p.subject && <div className="truncate text-xs text-muted-foreground">{p.subject}</div>}
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t("common:terms.mastery")}</span>
                            <span>{p.progress}%</span>
                        </div>
                        <Progress value={p.progress} aria-label={t("projects.masteryAria", { title: p.title })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">
                            {t("projects.readiness")} <span className="font-medium text-foreground">{p.readiness}%</span>
                        </span>
                        <span className={cn("inline-flex items-center gap-1", p.cards_due ? "text-primary" : "text-muted-foreground")}>
                            <Layers className="h-3.5 w-3.5" aria-hidden /> {t("projects.due", { count: p.cards_due })}
                        </span>
                        {p.days_to_exam !== null && p.days_to_exam >= 0 && (
                            <span className={cn("inline-flex items-center gap-1", examTone(p.days_to_exam))} title={formatDate(p.exam_date)}>
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {p.days_to_exam === 0 ? t("common:time.examToday") : t("common:time.daysToExam", { count: p.days_to_exam })}
                            </span>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    </section>
    );
};
