import { Crown } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import type { GamePlayer } from "@/features/games/interfaces/games.interfaces";
import { useTranslation } from "react-i18next";

const HEIGHTS = ["h-32", "h-24", "h-16"];
const ORDER = [1, 0, 2]; // 2nd, 1st, 3rd

/** Final podium for the top three players. */
export const GamePodium = ({ players }: { players: GamePlayer[] }) => {
    const { t } = useTranslation("games");
    const top = players.slice(0, 3);
    return (
        <div className="flex items-end justify-center gap-3 pt-6" aria-label={t("finished.podium")}>
            {ORDER.filter((i) => top[i]).map((i) => {
                const p = top[i];
                return (
                    <div key={p.user_id} className="flex w-28 flex-col items-center gap-2">
                        {i === 0 ? <Crown className="h-6 w-6 text-amber" aria-label={t("finished.winner")} /> : null}
                        <UserAvatar name={p.name} src={p.avatar_url} className={i === 0 ? "h-14 w-14" : "h-11 w-11"} />
                        <p className="w-full truncate text-center text-sm font-medium">{p.name}</p>
                        <p className="font-display text-lg tabular-nums">{p.score}</p>
                        <div className={cn("flex w-full items-start justify-center rounded-t-lg pt-2 font-display text-2xl", HEIGHTS[i], i === 0 ? "bg-primary text-primary-foreground" : "bg-surface-card")}>
                            {i + 1}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
