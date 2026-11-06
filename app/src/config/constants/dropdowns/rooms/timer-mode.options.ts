import type { TimerMode } from "@/features/rooms/interfaces/rooms.interfaces";
import { tr } from "@/lib/i18n-options";

type TimerModeOption = { id: TimerMode; label: string; defaultMinutes: number };

/** `label` is a live getter so it follows the active UI language. */
const timerMode = (id: TimerMode, defaultMinutes: number): TimerModeOption =>
    Object.defineProperty({ id, defaultMinutes }, "label", { enumerable: true, get: () => tr(`rooms:timer.modes.${id}`) }) as TimerModeOption;

export const TimerModeFormOptions: TimerModeOption[] = [timerMode("focus", 25), timerMode("break", 5)];

export const getTimerModeLabel = (id: string): string => TimerModeFormOptions.find((o) => o.id === id)?.label ?? id;

export const GameSpeedFormOptions: { id: string; label: string }[] = ["10", "20", "30", "60"].map(
    (id) => Object.defineProperty({ id }, "label", { enumerable: true, get: () => tr("rooms:game.speedSeconds", { count: Number(id) }) }) as { id: string; label: string },
);
