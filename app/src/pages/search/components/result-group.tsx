import type { ElementType, ReactNode } from "react";

interface ResultGroupProps {
    title: string;
    icon: ElementType;
    count: number;
    children: ReactNode;
}

export const ResultGroup = ({ title, icon: Icon, count, children }: ResultGroupProps) => {
    if (!count) return null;
    return (
        <section aria-label={title} className="rounded-xl border border-border bg-card">
            <h2 className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
                <span className="ml-auto tabular-nums">{count}</span>
            </h2>
            <ul className="divide-y divide-border">{children}</ul>
        </section>
    );
};
