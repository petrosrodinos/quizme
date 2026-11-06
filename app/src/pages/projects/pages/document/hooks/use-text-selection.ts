import { useCallback, useEffect, useState, type RefObject } from "react";

export interface ReaderSelection {
    text: string;
    rect: { top: number; left: number; bottom: number; width: number };
    chunkId: string | null;
    page: number | null;
    /** Surrounding paragraph, used as context for word lookups and actions. */
    context: string;
    /** True for a single word / short phrase (≤3 words). */
    isWord: boolean;
}

const MAX_SELECTION = 12000;

/** Tracks the user's text selection inside the reader container (mouse and keyboard selections). */
/** `active` re-binds listeners once the container is mounted. */
export const useTextSelection = (containerRef: RefObject<HTMLElement | null>, ignoreRef: RefObject<HTMLElement | null>, active = true) => {
    const [selection, setSelection] = useState<ReaderSelection | null>(null);

    const read = useCallback(() => {
        const sel = window.getSelection();
        const container = containerRef.current;
        if (!sel || sel.isCollapsed || !sel.rangeCount || !container) return;
        const range = sel.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;
        const text = sel.toString().replace(/\s+/g, " ").trim().slice(0, MAX_SELECTION);
        if (text.length < 2) return;
        const r = range.getBoundingClientRect();
        const anchor = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
        const chunkEl = anchor?.closest<HTMLElement>("[data-chunk-id]");
        const paraEl = anchor?.closest<HTMLElement>("[data-paragraph]");
        const words = text.split(/\s+/).length;
        setSelection({
            text,
            rect: { top: r.top, left: r.left, bottom: r.bottom, width: r.width },
            chunkId: chunkEl?.dataset.chunkId ?? null,
            page: chunkEl?.dataset.page ? Number(chunkEl.dataset.page) : null,
            context: (paraEl?.textContent ?? chunkEl?.textContent ?? text).slice(0, 1500),
            isWord: words <= 3 && text.length <= 40,
        });
    }, [containerRef]);

    const clear = useCallback(() => {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onUp = () => setTimeout(read, 0);
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.shiftKey || e.key === "Shift") setTimeout(read, 0);
        };
        const onDown = (e: MouseEvent) => {
            if (ignoreRef.current?.contains(e.target as Node)) return;
            // Portaled menus/popovers opened from the toolbar must not dismiss the selection.
            if ((e.target as Element | null)?.closest?.('[role="menu"],[data-reader-keep]')) return;
            setSelection(null);
        };
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setSelection(null);
        const onScroll = (e: Event) => {
            const target = e.target as Element | null;
            if (target instanceof Node && ignoreRef.current?.contains(target)) return;
            if (target?.closest?.('[role="menu"],[role="listbox"],[data-reader-keep]')) return;
            setSelection((s) => (s ? null : s));
        };
        container.addEventListener("mouseup", onUp);
        container.addEventListener("keyup", onKeyUp);
        container.addEventListener("touchend", onUp);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onEsc);
        window.addEventListener("scroll", onScroll, { passive: true, capture: true });
        return () => {
            container.removeEventListener("mouseup", onUp);
            container.removeEventListener("keyup", onKeyUp);
            container.removeEventListener("touchend", onUp);
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onEsc);
            window.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [containerRef, ignoreRef, read, active]);

    return { selection, clear };
};
