import { create } from "zustand";
import { devtools } from "zustand/middleware";

export const CelebrationKinds = {
    LEVEL_UP: "LEVEL_UP",
    ACHIEVEMENT: "ACHIEVEMENT",
    PERFECT: "PERFECT",
    DAILY_GOAL: "DAILY_GOAL",
} as const;
export type CelebrationKind = (typeof CelebrationKinds)[keyof typeof CelebrationKinds];

export interface Celebration {
    id: string;
    kind: CelebrationKind;
    title: string;
    description?: string;
    icon?: string;
    rarity?: string;
    level?: number;
}

export interface XpPopup {
    id: string;
    amount: number;
    x?: number;
    y?: number;
}

interface CelebrationsStore {
    queue: Celebration[];
    xpPopups: XpPopup[];
    push: (c: Omit<Celebration, "id">) => void;
    shift: () => void;
    pushXp: (amount: number, anchor?: { x: number; y: number }) => void;
    removeXp: (id: string) => void;
}

const STORE_KEY = "celebrations";
const uid = () => Math.random().toString(36).slice(2, 10);

/** Ephemeral (non-persisted) queue of celebration moments and floating XP popups. */
export const useCelebrationsStore = create<CelebrationsStore>()(
    devtools(
        (set) => ({
            queue: [],
            xpPopups: [],
            push: (c) => set((s) => ({ queue: [...s.queue, { ...c, id: uid() }].slice(-5) })),
            shift: () => set((s) => ({ queue: s.queue.slice(1) })),
            pushXp: (amount, anchor) => set((s) => ({ xpPopups: [...s.xpPopups, { id: uid(), amount, ...anchor }].slice(-6) })),
            removeXp: (id) => set((s) => ({ xpPopups: s.xpPopups.filter((p) => p.id !== id) })),
        }),
        { name: STORE_KEY },
    ),
);

export const getCelebrationsStoreState = () => useCelebrationsStore.getState();
