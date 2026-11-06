import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

const toDate = (value: string | Date | null | undefined): Date | null => {
    if (!value) return null;
    const d = typeof value === "string" ? parseISO(value) : value;
    return isValid(d) ? d : null;
};

export const formatDate = (value: string | Date | null | undefined, pattern = "MMM d, yyyy"): string => {
    const d = toDate(value);
    return d ? format(d, pattern) : "—";
};

export const formatDateTime = (value: string | Date | null | undefined): string => formatDate(value, "MMM d, yyyy · HH:mm");

export const formatRelative = (value: string | Date | null | undefined): string => {
    const d = toDate(value);
    return d ? `${formatDistanceToNowStrict(d)} ago` : "—";
};

export const daysUntil = (value: string | Date | null | undefined): number | null => {
    const d = toDate(value);
    return d ? differenceInCalendarDays(d, new Date()) : null;
};

export const formatDuration = (seconds: number | null | undefined): string => {
    const s = Math.max(0, Math.round(seconds ?? 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec ? `${sec}s` : ""}`.trim();
    return `${sec}s`;
};

export const formatClock = (seconds: number): string => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const browserTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
};

export const greeting = (date = new Date()): string => {
    const h = date.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
};
