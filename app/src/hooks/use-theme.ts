import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");
const systemTheme = (): ResolvedTheme => (media().matches ? "dark" : "light");
const resolve = (theme: Theme): ResolvedTheme => (theme === "system" ? systemTheme() : theme);

const readStored = (): Theme => {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === "light" || v === "dark" || v === "system" ? v : "system";
    } catch {
        return "system";
    }
};

/** Puts the resolved theme on <html> (class + color-scheme) and syncs the browser UI colour. */
const apply = (resolved: ResolvedTheme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#181715" : "#faf9f5");
};

interface ThemeStore {
    theme: Theme;
    resolved: ResolvedTheme;
    setTheme: (theme: Theme) => void;
}

/** One shared theme state, so the header toggle, user menu and Settings stay in sync. */
const useThemeStore = create<ThemeStore>()((set) => {
    const initial = readStored();
    return {
        theme: initial,
        resolved: resolve(initial),
        setTheme: (theme) => {
            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch {
                /* storage unavailable — theme still applies for this session */
            }
            const resolved = resolve(theme);
            apply(resolved);
            set({ theme, resolved });
        },
    };
});

if (typeof window !== "undefined") {
    apply(useThemeStore.getState().resolved);
    // Follow OS changes while the user is on "system".
    media().addEventListener("change", () => {
        const { theme } = useThemeStore.getState();
        if (theme !== "system") return;
        const resolved = systemTheme();
        apply(resolved);
        useThemeStore.setState({ resolved });
    });
    // Keep other open tabs in sync.
    window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY) useThemeStore.getState().setTheme(readStored());
    });
}

export const useTheme = () => {
    const theme = useThemeStore((s) => s.theme);
    const resolved = useThemeStore((s) => s.resolved);
    const setTheme = useThemeStore((s) => s.setTheme);
    return {
        theme,
        resolvedTheme: resolved,
        setTheme,
        /** Flips between light and dark (leaving "system" for an explicit choice). */
        toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
        getThemeIconType: () => (resolved === "dark" ? "sun" : "moon") as "sun" | "moon",
    };
};
