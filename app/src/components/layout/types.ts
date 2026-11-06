import type { ElementType } from "react";

export interface NavLink {
    title: string;
    url: string;
    icon?: ElementType;
    badge?: string;
    /** Match nested paths as active (e.g. /projects/123 under /projects). */
    matchPrefix?: boolean;
}

export interface NavGroup {
    title: string;
    items: NavLink[];
}
