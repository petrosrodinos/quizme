import { motion } from "motion/react";
import { Check } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import type { GamePlayer, GameReveal } from "@/features/games/interfaces/games.interfaces";
import { useTranslation } from "react-i18next";

interface GameLeaderboardProps {
    players: GamePlayer[];
    myId?: string;
    reveal?: GameReveal | null;
    showAnswered?: boolean;
    reduceMotion?: boolean;
}

/** Live rankings; rows animate into their new positions after each question. */
export const GameLeaderboard = ({ players, myId, reveal, showAnswered, reduceMotion }: GameLeaderboardProps) => {
    const { t } = useTranslation("games");
    return (
    <ol className="space-y-2" aria-label={t("rankings.title")}>
        {players.map((p) => {
            const result = reveal?.results.find((r) => r.user_id === p.user_id);
            return (
                <motion.li
                    key={p.user_id}
                    layout={!reduceMotion}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className={cn("flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2", p.user_id === myId && "border-primary/50 bg-primary/5")}
                >
                    <span className="w-6 text-center font-display text-lg text-muted-foreground">{p.rank}</span>
                    <UserAvatar name={p.name} src={p.avatar_url} className="h-8 w-8" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {p.name}
                        {p.user_id === myId ? <span className="text-muted-foreground"> {t("rankings.you")}</span> : null}
                    </span>
                    {showAnswered && p.answered_current ? (
                        <span className="flex items-center gap-1 text-xs text-success">
                            <Check className="h-3 w-3" /> {t("rankings.answered")}
                        </span>
                    ) : null}
                    {result ? (
                        <span className={cn("text-xs font-semibold", result.is_correct ? "text-success" : "text-muted-foreground")}>{result.points > 0 ? `+${result.points}` : "0"}</span>
                    ) : null}
                    <span className="w-16 text-right font-display text-lg tabular-nums">
                        <AnimatedCounter value={p.score} />
                    </span>
                </motion.li>
            );
        })}
    </ol>
    );
};
