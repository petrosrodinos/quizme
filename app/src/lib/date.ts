import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid, parseISO, type Locale } from "date-fns";
import { el, enGB } from "date-fns/locale";
import i18n, { currentLanguage } from "@/i18n";

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enGB, el };

/** date-fns locale for the active UI language. */
export const dateLocale = (): Locale => DATE_FNS_LOCALES[currentLanguage()] ?? enGB;

const toDate = (value: string | Date | null | undefined): Date | null => {
    if (!value) return null;
    const d = typeof value === "string" ? parseISO(value) : value;
    return isValid(d) ? d : null;
};

/** Localised date, e.g. "6 Nov 2026" / "6 Νοε 2026". Pass a date-fns pattern to override. */
export const formatDate = (value: string | Date | null | undefined, pattern = "d MMM yyyy"): string => {
    const d = toDate(value);
    return d ? format(d, pattern, { locale: dateLocale() }) : "—";
};

export const formatDateTime = (value: string | Date | null | undefined): string => formatDate(value, "d MMM yyyy · HH:mm");

/** "5 minutes ago" / "πριν από 5 λεπτά" (or "in 3 days" for future dates). */
export const formatRelative = (value: string | Date | null | undefined): string => {
    const d = toDate(value);
    return d ? formatDistanceToNowStrict(d, { addSuffix: true, locale: dateLocale() }) : "—";
};

export const daysUntil = (value: string | Date | null | undefined): number | null => {
    const d = toDate(value);
    return d ? differenceInCalendarDays(d, new Date()) : null;
};

/** Compact duration using localised unit abbreviations ("1h 5m" / "1ώ 5λ"). */
export const formatDuration = (seconds: number | null | undefined): string => {
    const s = Math.max(0, Math.round(seconds ?? 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const u = (key: "h" | "m" | "s", n: number) => i18n.t(`common:units.${key}`, { count: n });
    if (h) return `${u("h", h)} ${u("m", m)}`;
    if (m) return sec ? `${u("m", m)} ${u("s", sec)}` : u("m", m);
    return u("s", sec);
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

/** Time-of-day greeting in the active language. */
export const greeting = (date = new Date()): string => {
    const h = date.getHours();
    if (h < 12) return i18n.t("common:greeting.morning");
    if (h < 18) return i18n.t("common:greeting.afternoon");
    return i18n.t("common:greeting.evening");
};
