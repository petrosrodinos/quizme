import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import { useFeedback } from "@/hooks/use-feedback";

interface ExamTimerProps {
    deadline: string;
    serverTime: string;
    onExpire: () => void;
}

/** Countdown synced to server time; warns visually in the last minute and ticks in the final seconds. */
export const ExamTimer = ({ deadline, serverTime, onExpire }: ExamTimerProps) => {
    const { t } = useTranslation("quiz");
    const { play } = useFeedback();
    const offset = useRef(new Date(serverTime).getTime() - Date.now());
    const deadlineMs = new Date(deadline).getTime();
    const compute = () => Math.max(0, Math.round((deadlineMs - (Date.now() + offset.current)) / 1000));
    const [remaining, setRemaining] = useState(compute);
    const expired = useRef(false);
    const expireRef = useRef(onExpire);
    expireRef.current = onExpire;

    useEffect(() => {
        const timer = setInterval(() => {
            const r = compute();
            setRemaining(r);
            if (r > 0 && r <= 10) play("timerTick");
            if (r === 0 && !expired.current) {
                expired.current = true;
                expireRef.current();
            }
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deadlineMs]);

    const warning = remaining <= 60;
    return (
        <div
            role="timer"
            aria-live={remaining <= 60 && remaining % 15 === 0 ? "assertive" : "off"}
            aria-label={t("exam.timeRemaining", { time: formatClock(remaining) })}
            className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm tabular-nums",
                warning ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border bg-card",
                remaining <= 10 && remaining > 0 && "animate-pulse",
            )}
        >
            <Timer className="h-4 w-4" aria-hidden />
            {formatClock(remaining)}
        </div>
    );
};
