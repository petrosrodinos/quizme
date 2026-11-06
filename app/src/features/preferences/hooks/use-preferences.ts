import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { toast } from "@/hooks/use-toast";
import { getPreferences, updatePreferences } from "../services/preferences.services";
import type { UpdatePreferencesDto } from "../interfaces/preferences.interfaces";

export const usePreferences = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const setPreferences = usePreferencesStore((s) => s.setPreferences);
    return useQuery({
        queryKey: ["preferences"],
        queryFn: async () => {
            const prefs = await getPreferences();
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
            queryClient.invalidateQueries({ queryKey: ["preferences"] });
            if (!options.silent) toast({ title: "Preferences saved", duration: 1500 });
        },
        onError: (error: Error) => {
            queryClient.invalidateQueries({ queryKey: ["preferences"] });
            toast({ title: "Could not save preferences", description: error.message, variant: "error" });
        },
    });
};
