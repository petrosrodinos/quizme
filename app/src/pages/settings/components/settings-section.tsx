import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
    title: string;
    description?: ReactNode;
    children: ReactNode;
    tone?: "default" | "danger";
}

export const SettingsSection: FC<SettingsSectionProps> = ({ title, description, children, tone = "default" }) => (
    <section className={cn("rounded-xl border bg-card p-5 sm:p-6", tone === "danger" ? "border-destructive/40" : "border-border")}>
        <h2 className={cn("font-display text-lg", tone === "danger" && "text-destructive")}>{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4">{children}</div>
    </section>
);

interface ToggleRowProps {
    id: string;
    label: string;
    description?: string;
    control: ReactNode;
}

export const ToggleRow: FC<ToggleRowProps> = ({ id, label, description, control }) => (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            {description && <p id={`${id}-desc`} className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="shrink-0">{control}</div>
    </div>
);
