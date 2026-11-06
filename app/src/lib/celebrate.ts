import confetti from "canvas-confetti";
import { getPreferencesStoreState } from "@/stores/preferences";
import { shouldReduceMotion } from "@/lib/motion";

const COLORS = ["#cc785c", "#e8a55a", "#5db8a6", "#faf9f5", "#5db872"];

const allowed = () => !shouldReduceMotion(getPreferencesStoreState());

/** Confetti burst for celebrations. No-op when reduced motion, animations off or focus mode. */
export const celebrate = (kind: "burst" | "big" | "side" = "burst") => {
    if (!allowed()) return;
    if (kind === "side") {
        confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
        confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
        return;
    }
    confetti({
        particleCount: kind === "big" ? 160 : 80,
        spread: kind === "big" ? 100 : 70,
        startVelocity: kind === "big" ? 45 : 35,
        origin: { y: 0.6 },
        colors: COLORS,
        scalar: 0.9,
        ticks: 180,
        disableForReducedMotion: true,
    });
};

/** Small confetti burst anchored to an element (e.g. a completed progress ring). */
export const celebrateAt = (el: Element | null) => {
    if (!el || !allowed()) return;
    const rect = el.getBoundingClientRect();
    confetti({
        particleCount: 40,
        spread: 55,
        startVelocity: 25,
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
        colors: COLORS,
        scalar: 0.7,
        ticks: 120,
        disableForReducedMotion: true,
    });
};
