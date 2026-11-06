import { isAxiosError } from "axios";

/** Extracts a human-readable message from a NestJS error response (message may be a string or string[]). */
export const getApiErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
    if (isAxiosError(error)) {
        const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
        const message = data?.message;
        if (Array.isArray(message) && message.length) return String(message[0]);
        if (typeof message === "string" && message.trim()) return message;
        if (message && typeof message === "object" && "message" in message) return String((message as { message: unknown }).message);
        if (!error.response) return "Cannot reach the server. Check your connection and try again.";
        if (error.response.status === 429) return "Too many requests. Please slow down and try again shortly.";
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

/** Wraps a service call so it throws an Error with the best available message. */
export const withApiError = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getApiErrorMessage(error, fallback));
    }
};
