import type { ReactNode } from "react";

export interface HighlightSpan {
    text: string;
    color: string | null;
    title?: string;
}

/** Chip color map for highlight marks (visual only; labels live in dropdowns/notes). */
export const HighlightColorClass: Record<string, string> = {
    amber: "bg-amber/30",
    teal: "bg-teal/25",
    coral: "bg-primary/25",
    violet: "bg-violet-400/25",
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wraps every occurrence of saved highlight strings inside `text` with <mark>. Whitespace-tolerant. */
export const renderWithHighlights = (text: string, highlights: HighlightSpan[]): ReactNode[] => {
    const usable = highlights.filter((h) => h.text.trim().length >= 3).sort((a, b) => b.text.length - a.text.length);
    if (!usable.length) return [text];
    const pattern = new RegExp(usable.map((h) => escapeRe(h.text.trim()).replace(/\s+/g, "\\s+")).join("|"), "gi");
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = pattern.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        const norm = m[0].replace(/\s+/g, " ").toLowerCase();
        const h = usable.find((u) => u.text.replace(/\s+/g, " ").trim().toLowerCase() === norm);
        out.push(
            <mark key={`h${k++}`} className={`rounded-sm px-0.5 text-inherit ${HighlightColorClass[h?.color ?? "amber"] ?? HighlightColorClass.amber}`} title={h?.title}>
                {m[0]}
            </mark>,
        );
        last = m.index + m[0].length;
        if (m[0].length === 0) pattern.lastIndex++;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
};
