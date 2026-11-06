import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface MainProps extends HTMLAttributes<HTMLElement> {
    /** Constrain to a readable width (default) or use the full width. */
    width?: "default" | "wide" | "full" | "narrow";
}

const widths = { narrow: "max-w-3xl", default: "max-w-6xl", wide: "max-w-7xl", full: "max-w-none" };

/** Page content container used by every authenticated page. */
export const Main = ({ className, width = "default", ...props }: MainProps) => (
    <main id="main-content" className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8", widths[width], className)} {...props} />
);
