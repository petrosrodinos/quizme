import { Flame } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface StreakFlameProps {
    days: number;
    size?: "sm" | "md" | "lg";
    animate?: boolean;
    className?: string;
    showLabel?: boolean;
}

const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" };
const text = { sm: "text-sm", md: "text-base", lg: "text-2xl" };

/** Streak flame + day count. Flickers when active; the counter ticks on change. */
export const StreakFlame = ({ days, size = "md", animate = true, className, showLabel = false }: StreakFlameProps) => {
    const active = days > 0;
    return (
        <div className={cn("inline-flex items-center gap-1.5", className)} aria-label={`${days} day study streak`} title={`${days}-day streak`}>
            <Flame className={cn(sizes[size], active ? "fill-[#e8a55a] text-[#cc785c]" : "text-muted-foreground", active && animate && "animate-flame")} aria-hidden />
            <motion.span key={days} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("font-semibold tabular-nums", text[size], !active && "text-muted-foreground")}>
                {days}
            </motion.span>
            {showLabel && <span className="text-sm text-muted-foreground">day{days === 1 ? "" : "s"}</span>}
        </div>
    );
};
