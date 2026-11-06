import { tr } from "@/lib/i18n-options";

/** Best human-readable name for a user-like object. */
export const displayName = (u: { full_name?: string | null; email?: string | null; name?: string | null }) =>
    u.full_name || u.name || u.email?.split("@")[0] || tr("members:fallbackName");
