import i18n, { currentLocale } from "@/i18n";

export const formatBytes = (bytes: number | null | undefined): string => {
    const b = bytes ?? 0;
    if (b < 1024) return `${b} B`;
    const units = ["KB", "MB", "GB"];
    let v = b / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
};

export const formatNumber = (n: number | null | undefined): string => new Intl.NumberFormat(currentLocale()).format(Math.round(n ?? 0));

export const formatPercent = (n: number | null | undefined, digits = 0): string =>
    new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n ?? 0) + "%";

export const initials = (value: string | null | undefined): string => {
    if (!value) return "?";
    const parts = value.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
};

/** @deprecated English-only. Prefer `t(key, { count })` with `_one` / `_other` keys. Kept for backward compatibility. */
export const pluralize = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

/** Localised count of a common noun from `common:count.*` (e.g. tCount("question", 3) → "3 ερωτήσεις"). */
export const tCount = (noun: string, count: number): string => i18n.t(`common:count.${noun}`, { count }) as string;
