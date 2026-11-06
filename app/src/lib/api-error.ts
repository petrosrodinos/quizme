import { isAxiosError } from "axios";
import i18n from "@/i18n";

/** Deterministic key for a server message: "Invalid email or password" → "invalid_email_or_password". */
export const serverMessageKey = (message: string): string =>
    message
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);

/** Server messages that carry values: regex → serverErrors key (captured groups become {{p1}}, {{p2}}…). */
const PATTERNS: [RegExp, string][] = [
    [/^This invitation was sent to (.+)\. Sign in with that account to accept it\.$/, "pattern_invitation_other_account"],
    [/^This invitation is (\w+)$/, "pattern_invitation_status"],
    [/^File exceeds the (\d+) MB limit$/, "pattern_file_too_large"],
    [/^Already uploaded as "(.+)"$/, "pattern_already_uploaded"],
    [/^Upload at most (\d+) files at once$/, "pattern_upload_max_files"],
    [/^Processing failed: (.+)$/, "pattern_processing_failed"],
];

/**
 * Translates a server (English) message into the active UI language when a translation exists
 * in the `serverErrors` namespace; otherwise returns it unchanged.
 */
export const translateServerMessage = (message: string): string => {
    const text = message.trim();
    const key = `serverErrors:${serverMessageKey(text)}`;
    if (i18n.exists(key)) return i18n.t(key);
    for (const [re, k] of PATTERNS) {
        const m = re.exec(text);
        if (m) {
            const params = Object.fromEntries(m.slice(1).map((v, i) => [`p${i + 1}`, v]));
            if (params.p1 && i18n.exists(`serverErrors:status_${params.p1}`)) params.p1 = i18n.t(`serverErrors:status_${params.p1}`);
            return i18n.t(`serverErrors:${k}`, params);
        }
    }
    return text;
};

/** Extracts a human-readable (localised) message from a NestJS error response (message may be a string or string[]). */
export const getApiErrorMessage = (error: unknown, fallback = i18n.t("common:errors.generic")): string => {
    if (isAxiosError(error)) {
        const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
        const message = data?.message;
        if (Array.isArray(message) && message.length) return translateServerMessage(String(message[0]));
        if (typeof message === "string" && message.trim()) return translateServerMessage(message);
        if (message && typeof message === "object" && "message" in message) return translateServerMessage(String((message as { message: unknown }).message));
        if (!error.response) return i18n.t("common:errors.network");
        if (error.response.status === 429) return i18n.t("common:errors.rateLimited");
        if (error.response.status === 403) return i18n.t("common:errors.forbidden");
        if (error.response.status === 404) return i18n.t("common:errors.notFound");
    }
    if (error instanceof Error && error.message) return translateServerMessage(error.message);
    return fallback;
};

/** Wraps a service call so it throws an Error with the best available (localised) message. */
export const withApiError = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getApiErrorMessage(error, fallback));
    }
};
