import type { FC } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Routes } from "@/routes/routes";
import { pluralize } from "@/lib/format";
import type { Dashboard } from "@/features/dashboard/interfaces/dashboard.interfaces";

interface TodayCardProps {
    data: Dashboard;
}

/** Hero card: today's goal ring, the first steps of the recommended session and the main CTA. */
export const TodayCard: FC<TodayCardProps> = ({ data }) => {
    const { session, goal_progress, minutes } = data.today;
    const goal = data.gamification.daily_goal;
    const weakCount = data.weak_topics.length;
    return (
        <section aria-labelledby="today-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <ProgressRing value={goal_progress} size={132} strokeWidth={10} label="Daily goal progress" indicatorClassName={goal.met ? "stroke-success" : undefined}>
                    <span className="font-display text-3xl">{goal_progress}%</span>
                    <span className="text-xs text-muted-foreground">
                        {minutes}/{goal.minutes} min
                    </span>
                </ProgressRing>
                <div className="min-w-0 flex-1 space-y-3">
                    <div>
                        <h2 id="today-heading" className="font-display text-2xl">
                            Today&apos;s study
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {session.completed
                                ? "You completed today's session — anything extra is a bonus."
                                : session.blocks.length
                                  ? `About ${session.total_minutes} minutes recommended${session.focus_project ? ` · focus: ${session.focus_project.title}` : ""}.`
                                  : "Create a project and upload material to get a personalised plan."}
                        </p>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                        {weakCount > 0 && <li className="text-foreground">{pluralize(weakCount, "topic")} need review</li>}
                        {data.flashcards_due > 0 && <li className="text-foreground">Flashcards due: {data.flashcards_due}</li>}
                        {session.blocks.slice(0, 3).map((b, i) => (
                            <li key={`${b.type}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                                <span className="inline-block w-14 shrink-0 font-medium text-foreground">{b.minutes} min</span>
                                <span className="truncate">{b.title}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button asChild size="lg">
                            <Link to={Routes.study}>
                                {session.completed ? "Keep studying" : "Continue studying"} <ArrowRight />
                            </Link>
                        </Button>
                        {goal.met && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-success">
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> Daily goal met
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
