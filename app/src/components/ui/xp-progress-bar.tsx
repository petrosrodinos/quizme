import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface XpProgressBarProps {
    current: number;
    target: number;
    className?: string;
    showLabel?: boolean;
}

/** Smoothly animated XP bar toward the next level. */
export const XpProgressBar = ({ current, target, className, showLabel = true }: XpProgressBarProps) => {
    const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    return (
        <div className={cn("w-full", className)}>
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-surface-strong"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={current}
                aria-label="Experience toward next level"
            >
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#e8a55a] to-[#cc785c]"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
            {showLabel && (
                <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {current} / {target} XP
                </div>
            )}
        </div>
    );
};
