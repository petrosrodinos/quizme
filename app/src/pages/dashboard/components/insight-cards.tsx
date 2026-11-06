import type { FC } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Target } from "lucide-react";
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
    const data = [...scores].reverse().map((s, i) => ({ name: `#${i + 1}`, score: Math.round(s.percentage), title: s.quiz_title, date: formatDate(s.completed_at) }));
    return (
        <Card title="Recent quiz scores">
            {data.length ? (
                <div className="h-40" role="img" aria-label={`Recent quiz scores: ${data.map((d) => `${d.score}%`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(_l, p) => (p?.[0]?.payload ? `${p[0].payload.title} · ${p[0].payload.date}` : "")} />
                            <Bar dataKey="score" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Take a quiz to see your scores here.</p>
            )}
        </Card>
    );
};

export const WeakTopicsCard: FC<{ topics: Dashboard["weak_topics"] }> = ({ topics }) => (
    <Card title="Weak topics">
        {topics.length ? (
            <ul className="space-y-3">
                {topics.map((t) => (
                    <li key={t.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{t.name}</div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                                <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(4, t.mastery)}%` }} />
                            </div>
                        </div>
                        <span className="w-10 text-right text-xs text-muted-foreground">{t.mastery}%</span>
                        <Button asChild size="sm" variant="outline">
                            <Link to={Routes.projects.topics(t.project_id)} aria-label={`Practise ${t.name}`}>
                                <Target /> Practise
                            </Link>
                        </Button>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-muted-foreground">No weak spots detected yet. Keep practising to build your knowledge map.</p>
        )}
    </Card>
);

export const UpcomingExamsCard: FC<{ exams: Dashboard["upcoming_exams"] }> = ({ exams }) => (
    <Card title="Upcoming exams">
        {exams.length ? (
            <ul className="divide-y divide-border">
                {exams.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Link to={Routes.projects.plan(e.id)} className="min-w-0 hover:underline">
                            <div className="truncate text-sm font-medium">{e.title}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(e.exam_date)}</div>
                        </Link>
                        <div className="text-right">
                            <div className={cn("font-display text-xl", (e.days_to_exam ?? 99) <= 7 && "text-warning")}>{e.days_to_exam}d</div>
                            <div className="text-[11px] text-muted-foreground">readiness {e.readiness}%</div>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-muted-foreground">Set an exam date on a project to get a countdown and study plan.</p>
        )}
    </Card>
);

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });

export const WeekActivityCard: FC<{ week: Dashboard["week"]; goalMinutes: number }> = ({ week, goalMinutes }) => {
    const byDate = new Map(week.map((d) => [d.date, d]));
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const row = byDate.get(key);
        return { date: key, label: dayLabel(key), minutes: row?.minutes ?? 0, goal_met: row?.goal_met ?? false };
    });
    const total = days.reduce((s, d) => s + d.minutes, 0);
    return (
        <Card title="This week">
            <div className="mb-2 text-xs text-muted-foreground">{total} minutes studied · goal {goalMinutes} min/day</div>
            <div className="h-36" role="img" aria-label={`Minutes studied this week: ${days.map((d) => `${d.label} ${d.minutes}`).join(", ")}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={days} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
                        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v} min`, "Studied"]} />
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
                    <span className="h-2 w-2 rounded-full bg-success" /> Goal met
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-2)" }} /> Studied
                </span>
            </div>
        </Card>
    );
};
