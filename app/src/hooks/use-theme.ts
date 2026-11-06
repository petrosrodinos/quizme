import { create } from "zustand";
import { DEFAULT_SYSTEM_ID, getDesignSystem, loadFonts } from "@/themes/design-systems";
import { SYSTEM_PALETTE_ID, getPalette, paletteVars } from "@/themes/palettes";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const SYSTEM_KEY = "theme-system";
const PALETTE_KEY = "theme-palette";
/** Chosen look: Modern SaaS design system + Midnight Indigo palette. */
const DEFAULT_PALETTE_ID = "midnight";
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

const readStoredSystem = (): string => {
    try {
        return getDesignSystem(localStorage.getItem(SYSTEM_KEY) ?? DEFAULT_SYSTEM_ID).id;
    } catch {
        return DEFAULT_SYSTEM_ID;
    }
};

const readStoredPalette = (): string => {
    try {
        const v = localStorage.getItem(PALETTE_KEY);
        return v && (v === SYSTEM_PALETTE_ID || getPalette(v)) ? v : DEFAULT_PALETTE_ID;
    } catch {
        return DEFAULT_PALETTE_ID;
    }
};

/** Custom properties we set inline last time, so they can be cleared when switching. */
let appliedVars: string[] = [];

/**
 * Puts the resolved mode on <html> (class + color-scheme), then layers the selected design system
 * and colour palette on top as inline custom properties (they beat :root / .dark). The default
 * system with its own colours sets nothing, i.e. the plain index.css look.
 */
const apply = (resolved: ResolvedTheme, systemId: string, paletteId: string) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;

    const system = getDesignSystem(systemId);
    const palette = paletteId === SYSTEM_PALETTE_ID ? undefined : getPalette(paletteId);
    const colors = palette ? palette[resolved] : system[resolved];
    const vars = { ...system.vars, ...(colors ? paletteVars(colors, resolved === "dark") : {}) };

    for (const name of appliedVars) root.style.removeProperty(name);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    appliedVars = Object.keys(vars);

    loadFonts(system);
    root.dataset.ds = system.id;
    root.dataset.palette = palette?.id ?? SYSTEM_PALETTE_ID;
    const themeColor = colors?.bg ?? (resolved === "dark" ? "#181715" : "#faf9f5");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
};

interface ThemeStore {
    theme: Theme;
    resolved: ResolvedTheme;
    system: string;
    palette: string;
    setTheme: (theme: Theme) => void;
    setSystem: (id: string) => void;
    setPalette: (id: string) => void;
}

const persist = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* storage unavailable — the choice still applies for this session */
    }
};

/** One shared theme state, so the header toggle, user menu and Settings stay in sync. */
const useThemeStore = create<ThemeStore>()((set, get) => {
    const initial = readStored();
    return {
        theme: initial,
        resolved: resolve(initial),
        system: readStoredSystem(),
        palette: readStoredPalette(),
        setTheme: (theme) => {
            persist(STORAGE_KEY, theme);
            const resolved = resolve(theme);
            apply(resolved, get().system, get().palette);
            set({ theme, resolved });
        },
        setSystem: (id) => {
            persist(SYSTEM_KEY, id);
            apply(get().resolved, id, get().palette);
            set({ system: id });
        },
        setPalette: (id) => {
            persist(PALETTE_KEY, id);
            apply(get().resolved, get().system, id);
            set({ palette: id });
        },
    };
});

if (typeof window !== "undefined") {
    const { resolved, system, palette } = useThemeStore.getState();
    apply(resolved, system, palette);
    // Follow OS changes while the user is on "system".
    media().addEventListener("change", () => {
        const { theme, system, palette } = useThemeStore.getState();
        if (theme !== "system") return;
        const resolved = systemTheme();
        apply(resolved, system, palette);
        useThemeStore.setState({ resolved });
    });
    // Keep other open tabs in sync.
    window.addEventListener("storage", (e) => {
        const store = useThemeStore.getState();
        if (e.key === STORAGE_KEY) store.setTheme(readStored());
        if (e.key === SYSTEM_KEY) store.setSystem(readStoredSystem());
        if (e.key === PALETTE_KEY) store.setPalette(readStoredPalette());
    });
}

export const useTheme = () => {
    const theme = useThemeStore((s) => s.theme);
    const resolved = useThemeStore((s) => s.resolved);
    const setTheme = useThemeStore((s) => s.setTheme);
    const system = useThemeStore((s) => s.system);
    const setSystem = useThemeStore((s) => s.setSystem);
    const palette = useThemeStore((s) => s.palette);
    const setPalette = useThemeStore((s) => s.setPalette);
    return {
        theme,
        resolvedTheme: resolved,
        setTheme,
        /** Experimental: selected design system / colour palette (see src/themes). */
        system,
        setSystem,
        palette,
        setPalette,
        /** Flips between light and dark (leaving "system" for an explicit choice). */
        toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
        getThemeIconType: () => (resolved === "dark" ? "sun" : "moon") as "sun" | "moon",
    };
};
