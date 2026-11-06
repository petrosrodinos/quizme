import type { FC } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/routes";
import { formatNumber, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/features/gamification/hooks/use-gamification";
import { ChartCard } from "./progress-charts";

/** Weekly XP leaderboard for shared projects (opt-in; you always see yourself). */
export const LeaderboardCard: FC<{ projectId: string }> = ({ projectId }) => {
    const { data, isPending } = useLeaderboard(projectId);
    return (
        <ChartCard title="This week's leaderboard" description="Weekly XP among collaborators who opted in. Resets every Monday.">
            {isPending ? (
                <Skeleton className="h-32 w-full" />
            ) : (
                <>
                    {!data?.opted_in && (
                        <p className="mb-3 rounded-lg bg-surface-card p-3 text-xs text-muted-foreground">
                            Others can't see you yet.{" "}
                            <Link to={Routes.settings.preferences} className="font-medium text-primary hover:underline">
                                Opt in to leaderboards
                            </Link>
                        </p>
                    )}
                    <ol className="space-y-2">
                        {(data?.entries ?? []).map((e) => (
                            <li key={e.user_id} className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5", e.is_me && "bg-primary/8")}>
                                <span className="w-6 text-center text-sm font-medium tabular-nums text-muted-foreground">
                                    {e.rank === 1 ? <Trophy className="mx-auto h-4 w-4 text-amber" aria-label="First place" /> : e.rank}
                                </span>
                                <Avatar className="h-7 w-7">
                                    {e.avatar_url && <AvatarImage src={e.avatar_url} alt="" />}
                                    <AvatarFallback className="text-[10px]">{initials(e.name)}</AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 flex-1 truncate text-sm">
                                    {e.name}
                                    {e.is_me && <span className="text-muted-foreground"> (you)</span>}
                                </span>
                                <span className="text-sm tabular-nums">{formatNumber(e.xp)} XP</span>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </ChartCard>
    );
};
