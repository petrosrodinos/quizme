import type { FC, ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/date";
import { getReviewRatingLabel } from "@/config/constants/dropdowns/analytics/review-rating.options";
import type { ProjectProgress } from "@/features/analytics/interfaces/analytics.interfaces";

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: "var(--muted-foreground)" } as const;

export const ChartCard: FC<{ title: string; description?: string; children: ReactNode; className?: string }> = ({ title, description, children, className }) => (
    <section className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
        <h2 className="font-display text-lg">{title}</h2>
        {description && <p className="mb-3 text-xs text-muted-foreground">{description}</p>}
        <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
);

export const DailyActivityChart: FC<{ daily: ProjectProgress["daily"] }> = ({ daily }) => {
    const data = daily.map((d) => ({ ...d, label: formatDate(d.date, "MMM d") }));
    return (
        <div className="h-60" role="img" aria-label="Study minutes and accuracy over the last 30 days">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 6, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" {...axis} interval={4} />
                    <YAxis yAxisId="min" {...axis} allowDecimals={false} />
                    <YAxis yAxisId="acc" orientation="right" domain={[0, 100]} {...axis} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => (name === "accuracy" ? [`${v}%`, "Accuracy"] : [`${v} min`, "Studied"])} />
                    <Bar yAxisId="min" dataKey="minutes" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={14} />
                    <Line yAxisId="acc" dataKey="accuracy" stroke="var(--chart-1)" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export const AttemptsTrendChart: FC<{ attempts: ProjectProgress["attempts"] }> = ({ attempts }) => (
    <div className="h-56" role="img" aria-label={`Attempt scores: ${attempts.map((a) => `Attempt ${a.index} ${Math.round(a.percentage)}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attempts.map((a) => ({ ...a, name: `#${a.index}`, score: Math.round(a.percentage) }))} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" {...axis} />
                <YAxis domain={[0, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(_l, p) => (p?.[0]?.payload ? `${p[0].payload.title}` : "")} />
                <Line dataKey="score" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export const DifficultyChart: FC<{ rows: ProjectProgress["by_difficulty"] }> = ({ rows }) => (
    <div className="h-48" role="img" aria-label={`Accuracy by difficulty: ${rows.map((r) => `level ${r.difficulty} ${r.accuracy ?? "n/a"}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ name: `Lv ${r.difficulty}`, accuracy: r.accuracy ?? 0, total: r.total }))} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="name" {...axis} />
                <YAxis domain={[0, 100]} {...axis} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v, _n, p) => [`${v}% (${p?.payload?.total ?? 0} answers)`, "Accuracy"]} />
                <Bar dataKey="accuracy" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const RatingsChart: FC<{ rows: ProjectProgress["flashcards"]["by_rating"] }> = ({ rows }) => (
    <div className="h-48" role="img" aria-label={`Flashcard ratings: ${rows.map((r) => `${getReviewRatingLabel(r.rating)} ${r.count}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ name: getReviewRatingLabel(r.rating), count: r.count }))} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [v, "Reviews"]} />
                <Bar dataKey="count" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
        </ResponsiveContainer>
    </div>
);
