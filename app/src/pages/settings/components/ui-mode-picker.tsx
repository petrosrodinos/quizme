import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Mascot } from "@/components/ui/mascot";
import { useSetUiMode, useUiMode } from "@/hooks/use-ui-mode";
import { UiModes, type UiMode } from "@/features/preferences/interfaces/preferences.interfaces";
import { cn } from "@/lib/utils";

/** Mini preview of the playful UI: mascot + path nodes + bottom tabs. */
const PlayfulPreview = () => (
    <div className="relative h-28 overflow-hidden rounded-xl bg-white" aria-hidden>
        <div className="mx-2 mt-2 h-4 rounded-md bg-[#58cc02] shadow-[0_2px_0_0_#46a302]" />
        <div className="mt-2 flex flex-col items-center gap-1.5">
            <span className="h-4 w-5 rounded-full bg-[#ffc800] shadow-[0_2px_0_0_#e5a400]" />
            <span className="ml-6 h-4 w-5 rounded-full bg-[#58cc02] shadow-[0_2px_0_0_#46a302]" />
            <span className="ml-2 h-4 w-5 rounded-full bg-[#e5e5e5] shadow-[0_2px_0_0_#cfcfcf]" />
        </div>
        <Mascot pose="wave" className="absolute bottom-5 right-2 size-12" />
        <div className="absolute inset-x-0 bottom-0 flex h-4 items-center justify-around border-t border-[#e5e5e5] bg-white">
            {["#58cc02", "#1cb0f6", "#ce82ff", "#ff9600", "#ff4b4b"].map((c) => (
                <span key={c} className="size-2 rounded-sm" style={{ background: c }} />
            ))}
        </div>
    </div>
);

/** Mini preview of the classic UI: sidebar + header + cards. */
const ClassicPreview = () => (
    <div className="flex h-28 overflow-hidden rounded-xl border border-[#e6dfd8] bg-[#faf9f5]" aria-hidden>
        <div className="flex w-10 flex-col gap-1.5 bg-[#f5f0e8] p-1.5">
            <span className="h-2 rounded bg-[#cc785c]" />
            {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 rounded bg-[#e8e0d2]" />
            ))}
        </div>
        <div className="flex-1 p-2">
            <span className="mb-2 block h-2 w-16 rounded bg-[#141413]/70" />
            <div className="grid grid-cols-2 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-7 rounded-md border border-[#e6dfd8] bg-white" />
                ))}
            </div>
        </div>
    </div>
);

const MODES: { id: UiMode; preview: () => React.JSX.Element }[] = [
    { id: UiModes.PLAYFUL, preview: PlayfulPreview },
    { id: UiModes.CLASSIC, preview: ClassicPreview },
];

/** Lets the user switch between the playful (mobile-first) and classic UI. Persisted server-side. */
export const UiModePicker = ({ className }: { className?: string }) => {
    const { t } = useTranslation("playful");
    const mode = useUiMode();
    const setMode = useSetUiMode();
    return (
        <div role="radiogroup" aria-label={t("profile.uiMode")} className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
            {MODES.map(({ id, preview: Preview }) => {
                const active = mode === id;
                return (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMode(id)}
                        className={cn(
                            "relative rounded-2xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active ? "border-[var(--pf-blue,var(--primary))] bg-[color-mix(in_srgb,var(--pf-blue,var(--primary))_8%,transparent)]" : "border-border hover:bg-muted",
                        )}
                    >
                        <Preview />
                        <div className="mt-3 flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="font-bold">{t(`profile.modes.${id}`)}</div>
                                <p className="text-xs text-muted-foreground">{t(`profile.modes.${id}Description`)}</p>
                            </div>
                            <span
                                className={cn(
                                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                                    active ? "border-transparent bg-[var(--pf-blue,var(--primary))] text-white" : "border-border",
                                )}
                            >
                                {active && <Check className="size-3" strokeWidth={4} />}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
