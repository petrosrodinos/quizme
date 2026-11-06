import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { Routes } from "@/routes/routes";
import { deleteAccount, updateProfile } from "../services/account.services";

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const updateUser = useAuthStore((s) => s.updateUser);
    return useMutation({
        mutationFn: updateProfile,
        onSuccess: (user) => {
            updateUser(user);
            queryClient.invalidateQueries({ queryKey: ["me"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            toast({ title: "Profile saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save profile", description: error.message, variant: "error" }),
    });
};

/** Permanently deletes the account, then clears all local state. */
export const useDeleteAccount = () => {
    const queryClient = useQueryClient();
    const clear = useAuthStore((s) => s.clear);
    const resetPrefs = usePreferencesStore((s) => s.reset);
    const navigate = useNavigate();
    return useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => {
            clear();
            resetPrefs();
            queryClient.clear();
            navigate(Routes.auth.sign_up, { replace: true });
            toast({ title: "Account deleted", description: "Your account and data have been removed.", duration: 4000 });
        },
        onError: (error: Error) => toast({ title: "Could not delete account", description: error.message, variant: "error" }),
    });
};
