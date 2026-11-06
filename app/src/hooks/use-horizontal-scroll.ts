import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 5;

/**
 * Makes a horizontally overflowing strip usable with a mouse: vertical wheel scrolls sideways, click-and-drag scrolls
 * (without triggering the link under the pointer), and `canLeft` / `canRight` drive arrow buttons / fade edges.
 * Touch devices keep native swipe scrolling.
 */
export const useHorizontalScroll = <T extends HTMLElement>(deps: unknown[] = []) => {
    const ref = useRef<T>(null);
    const [edges, setEdges] = useState({ canLeft: false, canRight: false });

    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const canLeft = el.scrollLeft > 1;
        const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
        setEdges((prev) => (prev.canLeft === canLeft && prev.canRight === canRight ? prev : { canLeft, canRight }));
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };

        // Mouse drag-to-scroll (pointerType "mouse" only; touch/pen use native scrolling).
        let startX = 0;
        let startLeft = 0;
        let dragging = false;
        let moved = false;
        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            dragging = true;
            moved = false;
            startX = e.clientX;
            startLeft = el.scrollLeft;
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;
            moved = true;
            el.style.cursor = "grabbing";
            el.scrollLeft = startLeft - dx;
        };
        const onPointerUp = () => {
            dragging = false;
            el.style.cursor = "";
        };
        // Swallow the click that ends a drag so it doesn't navigate.
        const onClick = (e: MouseEvent) => {
            if (!moved) return;
            e.preventDefault();
            e.stopPropagation();
            moved = false;
        };
        const onDragStart = (e: DragEvent) => e.preventDefault();

        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("scroll", update, { passive: true });
        el.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        el.addEventListener("click", onClick, true);
        el.addEventListener("dragstart", onDragStart);
        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();
        return () => {
            el.removeEventListener("wheel", onWheel);
            el.removeEventListener("scroll", update);
            el.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            el.removeEventListener("click", onClick, true);
            el.removeEventListener("dragstart", onDragStart);
            ro.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [update, ...deps]);

    const scrollByPage = useCallback((direction: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
    }, []);

    return { ref, ...edges, scrollByPage };
};
