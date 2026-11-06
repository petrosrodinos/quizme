import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimerModeFormOptions, getTimerModeLabel } from "@/config/constants/dropdowns/rooms/timer-mode.options";
import { formatClock } from "@/lib/date";
import { useRoomTimer } from "@/features/rooms/hooks/use-rooms";
import type { TimerMode, TimerState } from "@/features/rooms/interfaces/rooms.interfaces";
import { useTranslation } from "react-i18next";

interface RoomTimerProps {
    roomId: string;
    timer: TimerState;
    onFinished?: () => void;
}

const remainingOf = (t: TimerState) => (t.status === "running" && t.ends_at ? Math.max(0, Math.round((new Date(t.ends_at).getTime() - Date.now()) / 1000)) : t.remaining_sec);

/** Shared Pomodoro timer: state lives on the server; every client renders the countdown from ends_at. */
export const RoomTimer = ({ roomId, timer, onFinished }: RoomTimerProps) => {
    const { t } = useTranslation("rooms");
    const action = useRoomTimer(roomId);
    const [remaining, setRemaining] = useState(() => remainingOf(timer));
    const [minutes, setMinutes] = useState(String(Math.round(timer.duration_sec / 60)));
    const finishedFor = useRef<string | null>(null);

    useEffect(() => {
        setRemaining(remainingOf(timer));
        setMinutes(String(Math.round(timer.duration_sec / 60)));
        if (timer.status !== "running") return;
        const id = window.setInterval(() => {
            const r = remainingOf(timer);
            setRemaining(r);
            if (r === 0 && finishedFor.current !== timer.ends_at) {
                finishedFor.current = timer.ends_at;
                onFinished?.();
            }
        }, 500);
        return () => window.clearInterval(id);
    }, [timer, onFinished]);

    const mins = Math.min(180, Math.max(1, Number(minutes) || 25));
    const setMode = (mode: TimerMode) => {
        const preset = TimerModeFormOptions.find((o) => o.id === mode)?.defaultMinutes ?? 25;
        action.mutate({ action: "reset", mode, minutes: preset });
    };
    const pct = timer.duration_sec ? ((timer.duration_sec - remaining) / timer.duration_sec) * 100 : 0;

    return (
        <section aria-label={t("timer.title")} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
                <h2 className="font-medium">{t("timer.title")}</h2>
                <Tabs value={timer.mode} onValueChange={(v) => setMode(v as TimerMode)}>
                    <TabsList>
                        {TimerModeFormOptions.map((o) => (
                            <TabsTrigger key={o.id} value={o.id} disabled={timer.status === "running"}>
                                {o.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
            <div className="mt-4 flex flex-col items-center gap-4">
                <ProgressRing value={pct} size={150} strokeWidth={10} label={t("timer.ringLabel", { mode: getTimerModeLabel(timer.mode) })}>
                    <span className="font-display text-4xl tabular-nums" aria-live="off">
                        {formatClock(remaining)}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{timer.status === "running" ? getTimerModeLabel(timer.mode) : timer.status === "paused" ? t("timer.paused") : t("timer.ready")}</span>
                </ProgressRing>
                <div className="flex items-center gap-2">
                    {timer.status !== "running" ? (
                        <>
                            {timer.status === "idle" ? (
                                <Input
                                    className="w-20 text-center"
                                    inputMode="numeric"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                    aria-label={t("timer.minutes")}
                                />
                            ) : null}
                            <Button onClick={() => action.mutate({ action: "start", minutes: timer.status === "idle" ? mins : undefined, mode: timer.mode })} loading={action.isPending}>
                                <Play className="mr-1.5 h-4 w-4" /> {timer.status === "paused" ? t("timer.resume") : t("timer.start")}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => action.mutate({ action: "pause" })} loading={action.isPending}>
                            <Pause className="mr-1.5 h-4 w-4" /> {t("timer.pause")}
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={t("timer.reset")} onClick={() => action.mutate({ action: "reset", mode: timer.mode, minutes: mins })} disabled={action.isPending}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </section>
    );
};
