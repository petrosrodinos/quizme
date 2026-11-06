import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { toast } from "@/hooks/use-toast";
import { tr } from "@/lib/i18n-options";
import { changeLanguage, currentLanguage, type SupportedLanguage } from "@/i18n";
import { getPreferences, updatePreferences } from "../services/preferences.services";
import type { UpdatePreferencesDto } from "../interfaces/preferences.interfaces";

/** Set when the user explicitly picks a language on this device but it hasn't been persisted server-side yet. */
const PENDING_LANGUAGE_KEY = "quizme-language-pending";

const readPendingLanguage = (): SupportedLanguage | null => {
    try {
        const v = localStorage.getItem(PENDING_LANGUAGE_KEY);
        return v === "en" || v === "el" ? v : null;
    } catch {
        return null;
    }
};
const writePendingLanguage = (lng: SupportedLanguage | null) => {
    try {
        if (lng) localStorage.setItem(PENDING_LANGUAGE_KEY, lng);
        else localStorage.removeItem(PENDING_LANGUAGE_KEY);
    } catch {
        /* storage unavailable */
    }
};

export const usePreferences = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const setPreferences = usePreferencesStore((s) => s.setPreferences);
    return useQuery({
        queryKey: ["preferences"],
        queryFn: async () => {
            let prefs = await getPreferences();
            // Language sync: an explicit choice made on this device wins (and is pushed to the server);
            // otherwise the server preference (synced across devices) is applied locally.
            const pending = readPendingLanguage();
            if (pending && pending !== prefs.language) {
                prefs = await updatePreferences({ language: pending });
                writePendingLanguage(null);
            } else {
                writePendingLanguage(null);
                if (prefs.language && prefs.language !== currentLanguage()) await changeLanguage(prefs.language);
            }
            setPreferences(prefs);
            return prefs;
        },
        enabled: isLoggedIn,
        staleTime: 5 * 60_000,
        retry: 1,
    });
};

/** Optimistically applies preference changes locally, then persists them server-side (synced across devices). */
export const useUpdatePreferences = (options: { silent?: boolean } = {}) => {
    const queryClient = useQueryClient();
    const setPreferences = usePreferencesStore((s) => s.setPreferences);
    return useMutation({
        mutationFn: (dto: UpdatePreferencesDto) => {
            setPreferences(dto);
            return updatePreferences(dto);
        },
        onSuccess: (prefs) => {
            setPreferences(prefs);
            queryClient.setQueryData(["preferences"], prefs);
            if (!options.silent) toast({ title: tr("settings:toasts.saved"), duration: 1500 });
        },
        onError: (error: Error) => {
            queryClient.invalidateQueries({ queryKey: ["preferences"] });
            toast({ title: tr("settings:toasts.saveFailed"), description: error.message, variant: "error" });
        },
    });
};

/**
 * Returns a callback for language switchers: remembers the explicit choice and persists it to the server
 * when signed in (the pending marker survives a failed request and is synced on the next preferences load).
 */
export const useSyncLanguageChoice = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const update = useUpdatePreferences({ silent: true });
    return useCallback(
        (language: SupportedLanguage) => {
            writePendingLanguage(language);
            if (!isLoggedIn) return;
            update.mutate({ language }, { onSuccess: () => writePendingLanguage(null) });
        },
        [isLoggedIn, update],
    );
};
