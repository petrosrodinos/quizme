import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProjectOverview } from "@/features/projects/interfaces/projects.interfaces";
import { formatDate } from "@/lib/date";
import { useTranslation } from "react-i18next";

interface RecentAttemptsChartProps {
    attempts: NonNullable<ProjectOverview["recent_attempts"]>;
}

/** Recent quiz scores, oldest → newest. */
export const RecentAttemptsChart = ({ attempts }: RecentAttemptsChartProps) => {
    const { t } = useTranslation("overview");
    const data = [...attempts]
        .reverse()
        .slice(-10)
        .map((a, i) => ({ name: `#${i + 1}`, score: Math.round(a.percentage), title: a.quiz_title, date: formatDate(a.completed_at) }));
    return (
        <div className="h-40 w-full" role="img" aria-label={t("attempts.chartLabel", { scores: data.map((d) => `${d.score}%`).join(", ") })}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip
                        cursor={{ fill: "var(--muted)" }}
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [`${v}%`, t("attempts.score")]}
                        labelFormatter={(_l, p) => (p?.[0]?.payload ? `${p[0].payload.title} · ${p[0].payload.date}` : "")}
                    />
                    <Bar dataKey="score" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
