import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
    /** 0-100 */
    value: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
    trackClassName?: string;
    indicatorClassName?: string;
    label?: string;
    children?: ReactNode;
}

/** Accessible SVG circular progress (daily goal, readiness, mastery). */
export const ProgressRing = ({ value, size = 96, strokeWidth = 8, className, trackClassName, indicatorClassName, label, children }: ProgressRingProps) => {
    const clamped = Math.max(0, Math.min(100, value || 0));
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div
            className={cn("relative inline-flex items-center justify-center", className)}
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} fill="none" className={cn("stroke-surface-strong", trackClassName)} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c - (clamped / 100) * c}
                    className={cn("stroke-primary transition-[stroke-dashoffset] duration-700 ease-out", indicatorClassName)}
                />
            </svg>
            {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
        </div>
    );
};
