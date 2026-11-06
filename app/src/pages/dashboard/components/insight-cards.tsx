import type { FC } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { currentLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/routes";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/features/dashboard/interfaces/dashboard.interfaces";

const Card: FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
        <h2 className="mb-3 font-display text-lg">{title}</h2>
        {children}
    </section>
);

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

export const RecentScoresCard: FC<{ scores: Dashboard["recent_scores"] }> = ({ scores }) => {
    const { t } = useTranslation("dashboard");
    const data = [...scores].reverse().map((s, i) => ({ name: `#${i + 1}`, score: Math.round(s.percentage), title: s.quiz_title, date: formatDate(s.completed_at) }));
    return (
        <Card title={t("insights.recentScores")}>
            {data.length ? (
                <div className="h-40" role="img" aria-label={t("insights.recentScoresAria", { scores: data.map((d) => `${d.score}%`).join(", ") })}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, t("common:terms.score")]} labelFormatter={(_l, p) => (p?.[0]?.payload ? `${p[0].payload.title} · ${p[0].payload.date}` : "")} />
                            <Bar dataKey="score" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t("insights.noScores")}</p>
            )}
        </Card>
    );
};

export const WeakTopicsCard: FC<{ topics: Dashboard["weak_topics"] }> = ({ topics }) => {
    const { t } = useTranslation("dashboard");
    return (
    <Card title={t("insights.weakTopics")}>
        {topics.length ? (
            <ul className="space-y-3">
                {topics.map((topic) => (
                    <li key={topic.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{topic.name}</div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                                <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(4, topic.mastery)}%` }} />
                            </div>
                        </div>
                        <span className="w-10 text-right text-xs text-muted-foreground">{topic.mastery}%</span>
                        <Button asChild size="sm" variant="outline">
                            <Link to={Routes.projects.topics(topic.project_id)} aria-label={t("insights.practiseAria", { name: topic.name })}>
                                <Target /> {t("insights.practise")}
                            </Link>
                        </Button>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-muted-foreground">{t("insights.noWeakTopics")}</p>
        )}
    </Card>
    );
};

export const UpcomingExamsCard: FC<{ exams: Dashboard["upcoming_exams"] }> = ({ exams }) => {
    const { t } = useTranslation("dashboard");
    return (
    <Card title={t("insights.upcomingExams")}>
        {exams.length ? (
            <ul className="divide-y divide-border">
                {exams.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Link to={Routes.projects.plan(e.id)} className="min-w-0 hover:underline">
                            <div className="truncate text-sm font-medium">{e.title}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(e.exam_date)}</div>
                        </Link>
                        <div className="text-right">
                            <div className={cn("font-display text-xl", (e.days_to_exam ?? 99) <= 7 && "text-warning")}>{t("insights.daysShort", { count: e.days_to_exam ?? 0 })}</div>
                            <div className="text-[11px] text-muted-foreground">{t("insights.readiness", { value: e.readiness })}</div>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-muted-foreground">{t("insights.noExams")}</p>
        )}
    </Card>
    );
};

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(currentLocale(), { weekday: "short" });

export const WeekActivityCard: FC<{ week: Dashboard["week"]; goalMinutes: number }> = ({ week, goalMinutes }) => {
    const byDate = new Map(week.map((d) => [d.date, d]));
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const row = byDate.get(key);
        return { date: key, label: dayLabel(key), minutes: row?.minutes ?? 0, goal_met: row?.goal_met ?? false };
    });
    const { t } = useTranslation("dashboard");
    const total = days.reduce((s, d) => s + d.minutes, 0);
    return (
        <Card title={t("common:time.thisWeek")}>
            <div className="mb-2 text-xs text-muted-foreground">{t("insights.weekSummary", { count: total, goal: goalMinutes })}</div>
            <div className="h-36" role="img" aria-label={t("insights.weekAria", { days: days.map((d) => `${d.label} ${d.minutes}`).join(", ") })}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={days} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
                        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [t("common:units.min", { count: Number(v) }), t("insights.studied")]} />
                        <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={28}>
                            {days.map((d) => (
                                <Cell key={d.date} fill={d.goal_met ? "var(--success)" : "var(--chart-2)"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" /> {t("insights.goalMet")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-2)" }} /> {t("insights.studied")}
                </span>
            </div>
        </Card>
    );
};
