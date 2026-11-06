import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useCelebrationsStore, type XpPopup } from "@/stores/celebrations";
import { cn } from "@/lib/utils";

interface XpBadgeProps {
    amount: number;
    className?: string;
}

/** Inline floating "+N XP" label for use next to an answered question. */
export const XpBadge = ({ amount, className }: XpBadgeProps) => (
    <motion.span
        initial={{ opacity: 0, y: 6, scale: 0.9 }}
        animate={{ opacity: 1, y: -4, scale: 1 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={cn("pointer-events-none inline-flex items-center rounded-full bg-amber/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber", className)}
    >
        +{amount} XP
    </motion.span>
);

const PopupItem = ({ popup }: { popup: XpPopup }) => {
    const remove = useCelebrationsStore((s) => s.removeXp);
    useEffect(() => {
        const t = setTimeout(() => remove(popup.id), 1400);
        return () => clearTimeout(t);
    }, [popup.id, remove]);
    const style = popup.x !== undefined ? { left: popup.x, top: popup.y } : { right: 24, top: 72 };
    return (
        <motion.div
            className="pointer-events-none fixed z-[90] -translate-x-1/2"
            style={style}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -36, scale: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            <span className="rounded-full bg-[#181715] px-3 py-1 text-sm font-semibold text-[#e8a55a] shadow-lg">+{popup.amount} XP</span>
        </motion.div>
    );
};

/** Global layer that renders queued XP popups (mounted once in the app shell). */
export const XpPopupLayer = () => {
    const popups = useCelebrationsStore((s) => s.xpPopups);
    return (
        <div aria-live="polite" className="sr-only-container">
            <span className="sr-only">{popups.length ? `Gained ${popups[popups.length - 1]!.amount} XP` : ""}</span>
            <AnimatePresence>
                {popups.map((p) => (
                    <PopupItem key={p.id} popup={p} />
                ))}
            </AnimatePresence>
        </div>
    );
};
