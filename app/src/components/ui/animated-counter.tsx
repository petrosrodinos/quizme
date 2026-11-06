import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

interface AnimatedCounterProps {
    value: number;
    durationMs?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

/** Counts up from the previous value to the new one. Renders the final value instantly under reduced motion. */
export const AnimatedCounter = ({ value, durationMs = 900, decimals = 0, prefix = "", suffix = "", className }: AnimatedCounterProps) => {
    const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0);
    const fromRef = useRef(display);

    useEffect(() => {
        if (prefersReducedMotion() || document.documentElement.dataset.reduceMotion === "true") {
            setDisplay(value);
            fromRef.current = value;
            return;
        }
        const from = fromRef.current;
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = from + (value - from) * eased;
            setDisplay(next);
            if (t < 1) frame = requestAnimationFrame(step);
            else fromRef.current = value;
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, durationMs]);

    return (
        <span className={className} aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}>
            {prefix}
            {display.toFixed(decimals)}
            {suffix}
        </span>
    );
};
