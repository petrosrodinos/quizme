import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlashcardStats as Stats } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { cn } from "@/lib/utils";

const Pill = ({ label, value, tone }: { label: string; value: number; tone: string }) => (
    <div className="flex flex-col rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("font-display text-2xl", tone)}>{value}</span>
    </div>
);

export const FlashcardStats = ({ stats, isPending }: { stats?: Stats; isPending: boolean }) => {
    if (isPending || !stats) return <Skeleton className="mb-6 h-28 w-full rounded-xl" />;
    const { counts, retention, forecast } = stats;
    const data = forecast.map((f, i) => ({ day: i === 0 ? "Today" : new Date(f.date).toLocaleDateString(undefined, { weekday: "short" }), count: f.count }));
    return (
        <section aria-label="Flashcard statistics" className="mb-6 grid gap-4 rounded-xl border border-border bg-surface p-4 lg:grid-cols-[1fr_280px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                <Pill label="Due now" value={counts.due} tone="text-primary" />
                <Pill label="New" value={counts.new} tone="text-foreground" />
                <Pill label="Learning" value={counts.learning} tone="text-amber" />
                <Pill label="Needs review" value={counts.needs_review} tone="text-destructive" />
                <Pill label="Known" value={counts.known} tone="text-success" />
                <div className="flex flex-col rounded-lg border border-border bg-card px-3 py-2">
                    <span className="text-xs text-muted-foreground">Retention (30d)</span>
                    <span className="font-display text-2xl">{retention === null ? "—" : `${retention}%`}</span>
                </div>
            </div>
            <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Reviews due — next 7 days</p>
                <div className="h-20" aria-label={`Forecast: ${data.map((d) => `${d.day} ${d.count}`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    );
};
