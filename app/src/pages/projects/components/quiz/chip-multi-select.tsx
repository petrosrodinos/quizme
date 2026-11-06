import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipMultiSelectProps<T extends string> {
    options: { id: T; label: string; depth?: number }[];
    value: T[];
    onChange: (value: T[]) => void;
    label: string;
    emptyHint?: string;
    className?: string;
}

/** Toggle-chip multi picker (each chip is a checkbox for screen readers). */
export const ChipMultiSelect = <T extends string>({ options, value, onChange, label, emptyHint, className }: ChipMultiSelectProps<T>) => {
    if (!options.length) return emptyHint ? <p className="text-xs text-muted-foreground">{emptyHint}</p> : null;
    return (
        <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
            {options.map((o) => {
                const active = value.includes(o.id);
                return (
                    <button
                        key={o.id}
                        type="button"
                        role="checkbox"
                        aria-checked={active}
                        onClick={() => onChange(active ? value.filter((v) => v !== o.id) : [...value, o.id])}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50",
                            o.depth ? "opacity-90" : "font-medium",
                        )}
                    >
                        {active && <Check className="h-3 w-3 text-primary" aria-hidden />}
                        {o.depth ? "↳ " : ""}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
};
