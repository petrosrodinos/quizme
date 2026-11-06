import { AnimatePresence, motion } from "motion/react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n-options";

interface ComboBadgeProps {
    combo: number;
    /** Hidden below this combo. */
    minVisible?: number;
    className?: string;
}

const intensity = (combo: number) => {
    if (combo >= 10) return "bg-gradient-to-r from-[#cc785c] via-[#e8a55a] to-[#cc785c] text-white shadow-[0_0_18px_rgba(232,165,90,0.55)]";
    if (combo >= 5) return "bg-[#e8a55a] text-[#181715]";
    return "bg-amber/25 text-amber-800 dark:text-amber";
};

/** Answer-streak combo counter (x3, x5, x10) with escalating intensity. */
export const ComboBadge = ({ combo, minVisible = 2, className }: ComboBadgeProps) => (
    <AnimatePresence mode="popLayout">
        {combo >= minVisible && (
            <motion.div
                key={combo}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1.25, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3 }}
                className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold", intensity(combo), className)}
                aria-live="polite"
                aria-label={tr("ui:combo", { count: combo })}
            >
                <Zap className="h-3.5 w-3.5" aria-hidden />x{combo}
            </motion.div>
        )}
    </AnimatePresence>
);
