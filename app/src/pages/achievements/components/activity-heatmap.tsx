import type { FC } from "react";
import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import type { ActivityDay } from "@/features/gamification/interfaces/gamification.interfaces";

const intensity = (d: ActivityDay) => {
    if (d.goal_met) return "bg-success";
    if (d.freeze_used) return "bg-teal/50";
    if (d.minutes_studied >= 10) return "bg-success/50";
    if (d.minutes_studied > 0 || d.xp_earned > 0) return "bg-success/25";
    return "bg-surface-strong";
};

/** 12-week calendar heatmap (columns = weeks, rows = weekdays). */
export const ActivityHeatmap: FC<{ days: ActivityDay[] }> = ({ days }) => {
    const first = days[0] ? new Date(`${days[0].date}T12:00:00`) : new Date();
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const cells: (ActivityDay | null)[] = [...Array.from({ length: offset }, () => null), ...days];
    const weeks: (ActivityDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const met = days.filter((d) => d.goal_met).length;
    return (
        <div>
            <div className="scrollbar-none overflow-x-auto">
                <div className="flex gap-1" role="img" aria-label={`Daily goal met on ${met} of the last ${days.length} days`}>
                    {weeks.map((w, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                            {Array.from({ length: 7 }).map((_, di) => {
                                const d = w[di];
                                if (!d) return <div key={di} className="h-3.5 w-3.5" />;
                                return (
                                    <div
                                        key={di}
                                        title={`${formatDate(d.date)} · ${d.minutes_studied} min · ${d.xp_earned} XP${d.goal_met ? " · goal met" : ""}${d.freeze_used ? " · streak freeze" : ""}`}
                                        className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-[3px]", intensity(d))}
                                    >
                                        {d.freeze_used && <Snowflake className="h-2.5 w-2.5 text-white" aria-hidden />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-surface-strong" /> No study
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-success/50" /> Studied
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Goal met
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-teal/50" /> Freeze used
                </span>
            </div>
        </div>
    );
};
