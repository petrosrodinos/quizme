import type { PaletteMode } from "./palettes";

/**
 * Complete design systems to compare. A system = typography + corner radius + shadows + its own
 * light/dark colours (+ a few structural CSS tweaks in design-systems.css keyed on `html[data-ds]`).
 * Colours can be overridden with any palette from palettes.ts.
 *
 * "editorial" is the current look and has no overrides (it is defined by index.css / DESIGN.MD).
 * Once a system is chosen, bake it into index.css and delete this folder + the switcher.
 */

export interface DesignSystem {
    id: string;
    name: string;
    description: string;
    /** Google Fonts `family=` values to load (e.g. "Sora:wght@400;600"). */
    fonts?: string[];
    /** CSS custom properties that define the structure (fonts, radius, shadows, heading style). */
    vars: Record<string, string>;
    /** Own colours; omitted for the default system, which uses the CSS in index.css. */
    light?: PaletteMode;
    dark?: PaletteMode;
}

export const DEFAULT_SYSTEM_ID = "saas";

const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, monospace";

const shadows = (xs: string, sm: string, md: string, lg: string) => ({
    "--ds-shadow-xs": xs,
    "--ds-shadow-sm": sm,
    "--ds-shadow-md": md,
    "--ds-shadow-lg": lg,
});
const NO_SHADOW = "0 0 #0000";

export const DESIGN_SYSTEMS: DesignSystem[] = [
    {
        id: DEFAULT_SYSTEM_ID,
        name: "Warm Editorial",
        description: "Current: serif headlines, cream canvas, coral accent, soft shadows",
        vars: {},
    },
    {
        id: "saas",
        name: "Modern SaaS",
        description: "Linear/Vercel-like: crisp, compact, one indigo accent, tight sans",
        vars: {
            "--radius": "0.5rem",
            "--ds-font-display": `'Inter', ${SANS}`,
            "--ds-display-weight": "600",
            "--ds-display-tracking": "-0.03em",
            "--ds-heading-tracking": "-0.03em",
            ...shadows(
                "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 1px rgb(0 0 0 / 0.04)",
                "0 4px 8px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
                "0 12px 24px -8px rgb(0 0 0 / 0.16)",
            ),
        },
        light: { bg: "#fcfcfd", fg: "#0b0b12", card: "#ffffff", primary: "#5e6ad2", primaryFg: "#ffffff", chart4: "#e5484d" },
        dark: { bg: "#08090a", fg: "#f2f3f5", card: "#101113", primary: "#7c85f0", primaryFg: "#0b0c14", chart4: "#ff6369" },
    },
    {
        id: "brutalist",
        name: "Neo-Brutalist",
        description: "Bold: zero radius, thick borders, hard offset shadows, loud yellow",
        fonts: ["Space+Grotesk:wght@400;500;600;700", "Space+Mono:wght@400;700"],
        vars: {
            "--radius": "0rem",
            "--ds-font-sans": `'Space Grotesk', ${SANS}`,
            "--ds-font-display": `'Space Grotesk', ${SANS}`,
            "--ds-font-mono": `'Space Mono', ${MONO}`,
            "--ds-display-weight": "700",
            "--ds-display-tracking": "-0.02em",
            "--ds-heading-tracking": "-0.02em",
            ...shadows("2px 2px 0 0 var(--border)", "3px 3px 0 0 var(--border)", "4px 4px 0 0 var(--border)", "6px 6px 0 0 var(--border)"),
        },
        light: { bg: "#fff8e1", fg: "#111111", card: "#ffffff", primary: "#ffd23f", primaryFg: "#111111", chart4: "#3a86ff", border: "#111111" },
        dark: { bg: "#121212", fg: "#fafafa", card: "#1c1c1c", primary: "#ffd23f", primaryFg: "#111111", chart4: "#6ea8ff", border: "#fafafa" },
    },
    {
        id: "playful",
        name: "Playful Rounded",
        description: "Duolingo-like: chunky, very round, bottom-ridge shadows, green",
        fonts: ["Nunito:wght@400;600;700;800"],
        vars: {
            "--radius": "1.25rem",
            "--ds-font-sans": `'Nunito', ${SANS}`,
            "--ds-font-display": `'Nunito', ${SANS}`,
            "--ds-display-weight": "800",
            "--ds-display-tracking": "-0.01em",
            "--ds-heading-tracking": "-0.01em",
            ...shadows("0 2px 0 0 var(--border)", "0 3px 0 0 var(--border)", "0 4px 0 0 var(--border)", "0 6px 0 0 var(--border)"),
        },
        light: { bg: "#f5faf0", fg: "#1f2a1a", card: "#ffffff", primary: "#58a700", primaryFg: "#ffffff", chart4: "#1cb0f6", border: "#dbe5d0" },
        dark: { bg: "#131f24", fg: "#eaf2ee", card: "#1b2b32", primary: "#58cc02", primaryFg: "#0d1a05", chart4: "#49c0f8", border: "#2c414a" },
    },
    {
        id: "aurora",
        name: "Aurora Glass",
        description: "Glassmorphism: translucent cards, gradient glow background, violet",
        fonts: ["Sora:wght@400;500;600;700"],
        vars: {
            "--radius": "1rem",
            "--ds-font-sans": `'Sora', ${SANS}`,
            "--ds-font-display": `'Sora', ${SANS}`,
            "--ds-display-weight": "600",
            "--ds-display-tracking": "-0.03em",
            "--ds-heading-tracking": "-0.03em",
            ...shadows(
                "0 1px 2px rgb(0 0 0 / 0.15)",
                "0 2px 12px -2px color-mix(in srgb, var(--primary) 30%, transparent)",
                "0 8px 30px -6px color-mix(in srgb, var(--primary) 35%, transparent)",
                "0 16px 50px -10px color-mix(in srgb, var(--primary) 45%, transparent)",
            ),
        },
        light: { bg: "#f3f1ff", fg: "#1a1433", card: "rgba(255, 255, 255, 0.72)", popover: "#ffffff", primary: "#7c5cff", primaryFg: "#ffffff", chart4: "#ff5fa2" },
        dark: { bg: "#0b0a1a", fg: "#eeeaff", card: "rgba(30, 26, 60, 0.6)", primary: "#9b8cff", primaryFg: "#0e0a24", chart4: "#ff7ab8" },
    },
    {
        id: "academic",
        name: "Academic Serif",
        description: "Bookish: serif everywhere, paper tones, hairline rules, burgundy",
        fonts: ["Source+Serif+4:opsz,wght@8..60,400;8..60,600", "Playfair+Display:wght@500;600;700"],
        vars: {
            "--radius": "0.25rem",
            "--ds-font-sans": `'Source Serif 4', ${SERIF}`,
            "--ds-font-display": `'Playfair Display', ${SERIF}`,
            "--ds-display-weight": "600",
            "--ds-display-tracking": "-0.01em",
            "--ds-heading-tracking": "-0.01em",
            ...shadows(NO_SHADOW, NO_SHADOW, "0 1px 0 0 var(--border)", "0 2px 0 0 var(--border)"),
        },
        light: { bg: "#fbf8f1", fg: "#231a14", card: "#fffdf8", primary: "#7a1f2b", primaryFg: "#ffffff", chart4: "#1f5f7a" },
        dark: { bg: "#17130f", fg: "#f1e9dc", card: "#1f1a15", primary: "#d98a95", primaryFg: "#2a0a10", chart4: "#7fb6cf" },
    },
    {
        id: "terminal",
        name: "Terminal",
        description: "Hacker: monospace everywhere, zero radius, flat, phosphor green",
        vars: {
            "--radius": "0rem",
            "--ds-font-sans": `'JetBrains Mono', ${MONO}`,
            "--ds-font-display": `'JetBrains Mono', ${MONO}`,
            "--ds-font-mono": `'JetBrains Mono', ${MONO}`,
            "--ds-display-weight": "500",
            "--ds-display-tracking": "-0.02em",
            "--ds-heading-tracking": "-0.02em",
            ...shadows(NO_SHADOW, NO_SHADOW, NO_SHADOW, NO_SHADOW),
        },
        light: { bg: "#f2f4ee", fg: "#10200f", card: "#fafbf7", primary: "#0a7d2c", primaryFg: "#ffffff", chart4: "#a85d00" },
        dark: { bg: "#0a0f0a", fg: "#b7f5c1", card: "#0f160f", primary: "#39ff6a", primaryFg: "#031507", chart4: "#ffb000" },
    },
    {
        id: "swiss",
        name: "Swiss Minimal",
        description: "International style: stark black/white, tight grotesk, flat, red accent",
        fonts: ["Inter+Tight:wght@400;500;600;700"],
        vars: {
            "--radius": "0.125rem",
            "--ds-font-sans": `'Inter Tight', ${SANS}`,
            "--ds-font-display": `'Inter Tight', ${SANS}`,
            "--ds-display-weight": "700",
            "--ds-display-tracking": "-0.04em",
            "--ds-heading-tracking": "-0.04em",
            ...shadows(NO_SHADOW, NO_SHADOW, NO_SHADOW, "0 1px 0 0 var(--border)"),
        },
        light: { bg: "#ffffff", fg: "#000000", card: "#ffffff", primary: "#e5231b", primaryFg: "#ffffff", chart4: "#0050ff" },
        dark: { bg: "#000000", fg: "#ffffff", card: "#0b0b0b", primary: "#ff3b30", primaryFg: "#ffffff", chart4: "#4d8dff" },
    },
];

export const getDesignSystem = (id: string): DesignSystem => DESIGN_SYSTEMS.find((s) => s.id === id) ?? DESIGN_SYSTEMS[0];

/** Injects Google Fonts stylesheets (once per family) for the given system(s). */
export const loadFonts = (...systems: DesignSystem[]) => {
    for (const family of systems.flatMap((s) => s.fonts ?? [])) {
        const id = `ds-font-${family}`;
        if (document.getElementById(id)) continue;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
        document.head.appendChild(link);
    }
};
