import { cn } from "@/lib/utils";

interface LevelBadgeProps {
    level: number;
    title?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const dims = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-16 w-16 text-2xl" };

/** Hexagon-ish level badge with optional level title. */
export const LevelBadge = ({ level, title, size = "md", className }: LevelBadgeProps) => (
    <div className={cn("inline-flex items-center gap-2", className)} title={title ? `Level ${level} · ${title}` : `Level ${level}`}>
        <div
            className={cn(
                "relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#cc785c] to-[#a9583e] font-bold text-white shadow-sm",
                dims[size],
            )}
            aria-label={`Level ${level}`}
        >
            {level}
        </div>
        {title && size !== "sm" && <span className="text-sm font-medium text-foreground">{title}</span>}
    </div>
);
