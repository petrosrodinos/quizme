import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Award, Target, Trophy } from "lucide-react";
import { CelebrationKinds, useCelebrationsStore, type Celebration } from "@/stores/celebrations";
import { LevelBadge } from "@/components/ui/level-badge";
import { celebrate } from "@/lib/celebrate";
import { useTranslation } from "react-i18next";
import { getAchievementRarityLabel } from "@/config/constants/dropdowns/gamification/achievement-rarity.options";

const AUTO_CLOSE_MS = 2800;

const Visual = ({ c }: { c: Celebration }) => {
    if (c.kind === CelebrationKinds.LEVEL_UP) return <LevelBadge level={c.level ?? 1} size="lg" />;
    const Icon = c.kind === CelebrationKinds.ACHIEVEMENT ? Award : c.kind === CelebrationKinds.DAILY_GOAL ? Target : Trophy;
    return (
        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8a55a] to-[#cc785c] text-white">
            {c.icon && c.kind === CelebrationKinds.ACHIEVEMENT ? <span className="text-3xl" aria-hidden>{c.icon}</span> : <Icon className="h-8 w-8" aria-hidden />}
            <span className="animate-shine absolute inset-y-0 w-1/3 bg-white/40" aria-hidden />
        </div>
    );
};

/**
 * Global celebration overlay (level up, rare achievement, perfect quiz, daily goal).
 * Short (≤3s), skippable by click or Escape, and never blocks the next interaction for long.
 */
export const CelebrationModal = () => {
    const { t } = useTranslation("ui");
    const current = useCelebrationsStore((s) => s.queue[0]);
    const shift = useCelebrationsStore((s) => s.shift);

    useEffect(() => {
        if (!current) return;
        celebrate(current.kind === CelebrationKinds.LEVEL_UP || current.kind === CelebrationKinds.PERFECT ? "big" : "burst");
        const t = setTimeout(shift, AUTO_CLOSE_MS);
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && shift();
        window.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            window.removeEventListener("keydown", onKey);
        };
    }, [current, shift]);

    return (
        <AnimatePresence>
            {current && (
                <motion.div
                    key={current.id}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={shift}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="celebration-title"
                >
                    <motion.div
                        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl"
                        initial={{ scale: 0.85, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    >
                        <div className="mb-4 flex justify-center">
                            <Visual c={current} />
                        </div>
                        <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                            {current.kind === CelebrationKinds.LEVEL_UP
                                ? t("celebration.levelUp")
                                : current.kind === CelebrationKinds.ACHIEVEMENT
                                  ? current.rarity
                                      ? t("celebration.rarityAchievement", { rarity: getAchievementRarityLabel(current.rarity) })
                                      : t("celebration.achievement")
                                  : current.kind === CelebrationKinds.DAILY_GOAL
                                    ? t("celebration.goalReached")
                                    : t("celebration.outstanding")}
                        </div>
                        <h2 id="celebration-title" className="mt-1 font-display text-3xl">
                            {current.title}
                        </h2>
                        {current.description && <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>}
                        <p className="mt-5 text-[11px] text-muted-foreground">{t("celebration.dismissHint")}</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
