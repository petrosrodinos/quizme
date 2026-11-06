import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ScoreHistoryChartProps {
    points: { label: string; percentage: number }[];
    target?: number | null;
    height?: number;
}

/** Attempt-over-attempt score trend (Attempt 1 → 62%, Attempt 2 → 74% …). */
export const ScoreHistoryChart = ({ points, target, height = 220 }: ScoreHistoryChartProps) => {
    const { t } = useTranslation("quiz");
    return (
    <div style={{ height }} className="w-full" role="img" aria-label={t("chart.ariaLabel", { points: points.map((p) => `${p.label} ${Math.round(p.percentage)}%`).join(", ") })}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${Math.round(Number(v))}%`, t("chart.score")]}
                />
                {target ? <ReferenceLine y={target} stroke="var(--chart-2)" strokeDasharray="5 4" label={{ value: t("chart.target", { value: target }), fontSize: 11, fill: "var(--muted-foreground)", position: "insideTopRight" }} /> : null}
                <Line type="monotone" dataKey="percentage" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} activeDot={{ r: 6 }} isAnimationActive />
            </LineChart>
        </ResponsiveContainer>
    </div>
    );
};
