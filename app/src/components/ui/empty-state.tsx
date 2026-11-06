import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: ElementType;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
}

export const EmptyState = ({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) => (
    <div
        className={cn(
            "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 text-center",
            compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
            className,
        )}
    >
        {Icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-primary">
                <Icon className="h-6 w-6" aria-hidden />
            </div>
        )}
        <h3 className="font-display text-xl text-foreground">{title}</h3>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
    </div>
);
