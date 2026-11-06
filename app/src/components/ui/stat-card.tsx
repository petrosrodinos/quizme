import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface StatCardProps {
    label: string;
    value: number | string;
    suffix?: string;
    decimals?: number;
    icon?: ElementType;
    hint?: ReactNode;
    tone?: "default" | "primary" | "success" | "warning" | "danger";
    className?: string;
}

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
    default: "bg-surface-card text-foreground",
    primary: "bg-primary/12 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/12 text-destructive",
};

export const StatCard = ({ label, value, suffix, decimals = 0, icon: Icon, hint, tone = "default", className }: StatCardProps) => (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
        <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
            {Icon && (
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneClass[tone])}>
                    <Icon className="h-4 w-4" aria-hidden />
                </div>
            )}
        </div>
        <div className="mt-2 font-display text-3xl text-foreground">
            {typeof value === "number" ? <AnimatedCounter value={value} decimals={decimals} suffix={suffix} /> : `${value}${suffix ?? ""}`}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
);
