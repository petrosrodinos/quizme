import type { TimerMode } from "@/features/rooms/interfaces/rooms.interfaces";

export const TimerModeFormOptions: { id: TimerMode; label: string; defaultMinutes: number }[] = [
    { id: "focus", label: "Focus", defaultMinutes: 25 },
    { id: "break", label: "Break", defaultMinutes: 5 },
];

export const getTimerModeLabel = (id: string): string => TimerModeFormOptions.find((o) => o.id === id)?.label ?? id;

export const GameSpeedFormOptions: { id: string; label: string }[] = [
    { id: "10", label: "10 seconds" },
    { id: "20", label: "20 seconds" },
    { id: "30", label: "30 seconds" },
    { id: "60", label: "60 seconds" },
];
