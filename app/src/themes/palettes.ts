/**
 * Colour palettes for trying out different looks. Any palette can be applied on top of any design
 * system (design-systems.ts), which otherwise brings its own colours. Each palette defines a light and a dark variant;
 * everything else (surfaces, borders, muted text, sidebar…) is derived from these few colours via
 * `color-mix`, so a new palette is ~12 hex values.
 *
 * The "default" palette has no overrides — it is the warm editorial look from index.css / DESIGN.MD.
 * Once a palette is chosen, move its values into index.css (:root / .dark) and delete this folder
 * together with `ThemePaletteSwitcher`.
 */

export interface PaletteMode {
    bg: string;
    fg: string;
    card: string;
    primary: string;
    /** Text colour on top of `primary`. */
    primaryFg: string;
    /** 4th chart colour — a secondary hue for variety in charts/badges. */
    chart4: string;
    /** Optional explicit border colour (otherwise derived from fg/bg). */
    border?: string;
    /** Optional opaque popover colour (needed when `card` is translucent). */
    popover?: string;
}

export interface Palette {
    id: string;
    name: string;
    description: string;
    light: PaletteMode;
    dark: PaletteMode;
}

/** Special id: use the colours of the selected design system instead of a palette. */
export const SYSTEM_PALETTE_ID = "system";

export const PALETTES: Palette[] = [
    {
        id: "warm",
        name: "Warm Editorial",
        description: "Current colours — cream canvas, coral accent",
        light: { bg: "#faf9f5", fg: "#141413", card: "#ffffff", primary: "#cc785c", primaryFg: "#ffffff", chart4: "#6b7fd7" },
        dark: { bg: "#181715", fg: "#faf9f5", card: "#1f1e1b", primary: "#d98a6f", primaryFg: "#181715", chart4: "#8c9be6" },
    },
    {
        id: "ocean",
        name: "Ocean",
        description: "Clean, trustworthy blue",
        light: { bg: "#f6f9fc", fg: "#0f1b2d", card: "#ffffff", primary: "#2563eb", primaryFg: "#ffffff", chart4: "#c2410c" },
        dark: { bg: "#0b1220", fg: "#e8eefb", card: "#111a2c", primary: "#5b9bff", primaryFg: "#07111f", chart4: "#fb923c" },
    },
    {
        id: "forest",
        name: "Forest",
        description: "Calm, focused green",
        light: { bg: "#f6f8f4", fg: "#14201a", card: "#ffffff", primary: "#2f7d4f", primaryFg: "#ffffff", chart4: "#b45309" },
        dark: { bg: "#0e1511", fg: "#e9f3ec", card: "#141d17", primary: "#4cc27a", primaryFg: "#07120b", chart4: "#f0b35a" },
    },
    {
        id: "violet",
        name: "Violet",
        description: "Playful, creative purple",
        light: { bg: "#f9f7fd", fg: "#1c1530", card: "#ffffff", primary: "#7c3aed", primaryFg: "#ffffff", chart4: "#0f9d8a" },
        dark: { bg: "#130f20", fg: "#f0ecfb", card: "#1b1630", primary: "#a78bfa", primaryFg: "#150f28", chart4: "#4fd1b8" },
    },
    {
        id: "rose",
        name: "Rose",
        description: "Warm, energetic pink-red",
        light: { bg: "#fdf7f8", fg: "#2a1217", card: "#ffffff", primary: "#e11d48", primaryFg: "#ffffff", chart4: "#2563eb" },
        dark: { bg: "#190f12", fg: "#fbeef1", card: "#22141a", primary: "#fb7185", primaryFg: "#240a10", chart4: "#7aa7ff" },
    },
    {
        id: "sunset",
        name: "Sunset",
        description: "Optimistic amber / orange",
        light: { bg: "#fdf9f1", fg: "#2a1c08", card: "#ffffff", primary: "#d97706", primaryFg: "#ffffff", chart4: "#0e7490" },
        dark: { bg: "#17120a", fg: "#fbf3e3", card: "#1f180d", primary: "#f5a524", primaryFg: "#1c1204", chart4: "#38bdf8" },
    },
    {
        id: "mint",
        name: "Mint",
        description: "Fresh, modern teal",
        light: { bg: "#f2f9f8", fg: "#0c1f1d", card: "#ffffff", primary: "#0d9488", primaryFg: "#ffffff", chart4: "#c026d3" },
        dark: { bg: "#0a1514", fg: "#e4f6f3", card: "#102020", primary: "#2dd4bf", primaryFg: "#04201c", chart4: "#e879f9" },
    },
    {
        id: "mono",
        name: "Mono",
        description: "Neutral black & white, shadcn-style",
        light: { bg: "#fafafa", fg: "#09090b", card: "#ffffff", primary: "#18181b", primaryFg: "#fafafa", chart4: "#2563eb" },
        dark: { bg: "#09090b", fg: "#fafafa", card: "#111113", primary: "#fafafa", primaryFg: "#18181b", chart4: "#60a5fa" },
    },
    {
        id: "midnight",
        name: "Midnight Indigo",
        description: "Deep, studious indigo",
        light: { bg: "#f7f7fc", fg: "#14143a", card: "#ffffff", primary: "#4f46e5", primaryFg: "#ffffff", chart4: "#d97706" },
        dark: { bg: "#0a0a1c", fg: "#ecebfb", card: "#11112a", primary: "#818cf8", primaryFg: "#0b0b24", chart4: "#fbbf24" },
    },
    {
        id: "mocha",
        name: "Mocha",
        description: "Earthy, bookish brown",
        light: { bg: "#f8f4ee", fg: "#25190f", card: "#fffdf9", primary: "#8b5e3c", primaryFg: "#ffffff", chart4: "#4d7c6a" },
        dark: { bg: "#16110d", fg: "#f4ebe0", card: "#1e1812", primary: "#c89b72", primaryFg: "#1c130b", chart4: "#7fb5a0" },
    },
];

export const getPalette = (id: string): Palette | undefined => PALETTES.find((p) => p.id === id);

const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

/** Expands a palette's base colours into every CSS variable the app reads. */
export const paletteVars = (m: PaletteMode, dark: boolean): Record<string, string> => {
    const { bg, fg, card, primary, primaryFg, chart4 } = m;
    // Three surface tiers stepping away from the background toward the foreground.
    const s1 = mix(fg, dark ? 4 : 3, bg);
    const s2 = mix(fg, dark ? 8 : 7, bg);
    const s3 = mix(fg, dark ? 13 : 12, bg);
    const border = m.border ?? mix(fg, dark ? 14 : 12, bg);
    const mutedFg = mix(fg, dark ? 62 : 60, bg);
    const teal = dark ? "#5db8a6" : "#3f9b89";
    const amber = "#e8a55a";

    return {
        "--ink": fg,
        "--background": bg,
        "--foreground": fg,
        "--card": card,
        "--card-foreground": fg,
        "--popover": m.popover ?? (dark ? s2 : card),
        "--popover-foreground": fg,
        "--primary": primary,
        "--primary-foreground": primaryFg,
        "--secondary": s2,
        "--secondary-foreground": fg,
        "--muted": dark ? s2 : s1,
        "--muted-foreground": mutedFg,
        "--accent": dark ? s3 : s2,
        "--accent-foreground": fg,
        "--accent-teal": teal,
        "--accent-amber": amber,
        "--surface": dark ? card : s1,
        "--surface-card": s2,
        "--surface-strong": s3,
        "--border": border,
        "--input": dark ? s3 : border,
        "--ring": primary,
        "--chart-1": primary,
        "--chart-2": teal,
        "--chart-3": amber,
        "--chart-4": chart4,
        "--chart-5": mutedFg,
        "--sidebar": dark ? card : s1,
        "--sidebar-foreground": fg,
        "--sidebar-primary": primary,
        "--sidebar-primary-foreground": primaryFg,
        "--sidebar-accent": s3,
        "--sidebar-accent-foreground": fg,
        "--sidebar-border": border,
        "--sidebar-ring": primary,
    };
};
