import { useEffect } from "react";
import { Check, Monitor, Moon, Palette as PaletteIcon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { DESIGN_SYSTEMS, loadFonts } from "@/themes/design-systems";
import { PALETTES, SYSTEM_PALETTE_ID, type PaletteMode } from "@/themes/palettes";

const MODES: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
];

const Swatches = ({ m }: { m: PaletteMode }) => (
    <span className="flex shrink-0 overflow-hidden rounded-md border" aria-hidden>
        {[m.bg, m.card, m.primary, m.chart4, m.fg].map((c, i) => (
            <span key={i} className="h-7 w-3.5" style={{ background: c }} />
        ))}
    </span>
);

const Section = ({ children }: { children: string }) => <p className="mb-1.5 mt-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">{children}</p>;

/**
 * TEMPORARY design tool: floating design-system + colour-palette + light/dark picker for comparing looks.
 * Only rendered in dev builds. Remove once a design is chosen (see src/themes).
 */
export function ThemePaletteSwitcher() {
    const { theme, setTheme, resolvedTheme, system, setSystem, palette, setPalette } = useTheme();

    // Preload every system's fonts so the previews below render in their own typeface.
    useEffect(() => loadFonts(...DESIGN_SYSTEMS), []);

    const fallback = PALETTES[0][resolvedTheme];

    return (
        <div className="fixed bottom-4 right-4 z-[60]">
            <Popover>
                <PopoverTrigger asChild>
                    <Button size="icon" className="h-11 w-11 rounded-full shadow-lg" aria-label="Open design switcher">
                        <PaletteIcon aria-hidden />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" className="w-[22rem] p-3">
                    <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                        {MODES.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setTheme(value)}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                    theme === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon className="size-3.5" aria-hidden />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto pr-1">
                        <Section>Design system</Section>
                        <div className="space-y-1">
                            {DESIGN_SYSTEMS.map((s) => {
                                const active = s.id === system;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSystem(s.id)}
                                        className={cn("flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-accent", active ? "border-primary bg-accent" : "border-transparent")}
                                    >
                                        <Swatches m={s[resolvedTheme] ?? fallback} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold" style={{ fontFamily: s.vars["--ds-font-display"] }}>
                                                {s.name}
                                            </span>
                                            <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
                                        </span>
                                        {active && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                                    </button>
                                );
                            })}
                        </div>

                        <Section>Colours</Section>
                        <div className="grid grid-cols-2 gap-1">
                            {[{ id: SYSTEM_PALETTE_ID, name: "System's own", m: null as PaletteMode | null }, ...PALETTES.map((p) => ({ id: p.id, name: p.name, m: p[resolvedTheme] }))].map((p) => {
                                const active = p.id === palette;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPalette(p.id)}
                                        className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent", active ? "border-primary bg-accent" : "border-transparent")}
                                    >
                                        {p.m ? (
                                            <span className="flex shrink-0 overflow-hidden rounded border" aria-hidden>
                                                {[p.m.bg, p.m.primary, p.m.chart4].map((c, i) => (
                                                    <span key={i} className="h-4 w-3" style={{ background: c }} />
                                                ))}
                                            </span>
                                        ) : (
                                            <span className="flex h-4 w-9 shrink-0 items-center justify-center rounded border text-[9px] text-muted-foreground" aria-hidden>
                                            </span>
                                        )}
                                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                                        {active && <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
