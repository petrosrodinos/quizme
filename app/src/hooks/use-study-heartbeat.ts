import { useEffect, useRef } from "react";
import { logStudyActivity } from "@/features/study/services/study.services";
import type { StudyActivityType } from "@/features/study/interfaces/study.interfaces";

const INTERVAL_MS = 60_000;
const IDLE_MS = 2 * 60_000;
const MAX_SECONDS = 300;

interface StudyHeartbeatOptions {
    projectId?: string;
    type: StudyActivityType;
    enabled?: boolean;
}

/**
 * Reports active study time to the server every minute while the tab is visible and the
 * learner has interacted recently (mouse/keys/touch/scroll within 2 minutes). Feeds the
 * daily goal, streaks and analytics. Seconds are capped server- and client-side.
 */
export const useStudyHeartbeat = ({ projectId, type, enabled = true }: StudyHeartbeatOptions) => {
    const lastActive = useRef(Date.now());
    const lastSent = useRef(Date.now());
    const pending = useRef(0);

    useEffect(() => {
        if (!enabled) return;
        const mark = () => {
            lastActive.current = Date.now();
        };
        const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
        events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

        const tick = () => {
            const now = Date.now();
            const elapsed = now - lastSent.current;
            lastSent.current = now;
            const active = document.visibilityState === "visible" && now - lastActive.current < IDLE_MS;
            if (active) pending.current += Math.round(elapsed / 1000);
            const seconds = Math.min(MAX_SECONDS, pending.current);
            if (seconds < 15) return;
            pending.current -= seconds;
            void logStudyActivity({ project_id: projectId, type, seconds }).catch(() => {
                /* best effort: dropped heartbeats are acceptable */
            });
        };
        const timer = window.setInterval(tick, INTERVAL_MS);
        return () => {
            window.clearInterval(timer);
            events.forEach((e) => window.removeEventListener(e, mark));
            tick();
        };
    }, [projectId, type, enabled]);
};
