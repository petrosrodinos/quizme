import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export const PageHeader = ({ title, description, eyebrow, actions, className }: PageHeaderProps) => (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
        <div className="min-w-0 space-y-1">
            {eyebrow && <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</div>}
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-[34px]">{title}</h1>
            {description && <p className="max-w-2xl text-sm text-muted-foreground sm:text-[15px]">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
);
