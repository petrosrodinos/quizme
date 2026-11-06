import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AuthUser, AuthSession } from "@/features/auth/interfaces/auth.interface";

interface AuthStore {
    isLoggedIn: boolean;
    access_token: string | null;
    expires_in: number | null;
    user: AuthUser | null;
    login: (session: AuthSession) => void;
    updateUser: (user: Partial<AuthUser>) => void;
    /** Clears local auth state. Use the useLogout hook to also revoke the server session. */
    clear: () => void;
}

const STORE_KEY = "auth";

const initialValues = {
    isLoggedIn: false,
    access_token: null,
    expires_in: null,
    user: null,
};

export const useAuthStore = create<AuthStore>()(
    devtools(
        persist(
            (set) => ({
                ...initialValues,
                login: (session) =>
                    set({
                        isLoggedIn: true,
                        access_token: session.access_token,
                        expires_in: session.expires_in,
                        user: session.user,
                    }),
                updateUser: (user) => set((state) => ({ user: state.user ? { ...state.user, ...user } : state.user })),
                clear: () => set(initialValues),
            }),
            {
                name: STORE_KEY,
                partialize: (state) => ({
                    isLoggedIn: state.isLoggedIn,
                    access_token: state.access_token,
                    expires_in: state.expires_in,
                    user: state.user,
                }),
            },
        ),
        { name: STORE_KEY },
    ),
);

export const getAuthStoreState = () => useAuthStore.getState();
