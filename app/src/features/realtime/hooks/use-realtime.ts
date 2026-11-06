import { useEffect, useRef, useState } from "react";
import { isRealtimeConnected, onRealtimeConnectionChange, realtimeOn } from "../services/realtime.services";

/** Subscribes to a server-pushed Socket.IO event for the component's lifetime. */
export const useRealtimeEvent = <T = unknown>(event: string, handler: (payload: T) => void) => {
    const ref = useRef(handler);
    ref.current = handler;
    useEffect(() => realtimeOn(event, (payload) => ref.current(payload as T)), [event]);
};

export const useRealtimeConnected = () => {
    const [connected, setConnected] = useState(isRealtimeConnected());
    useEffect(() => onRealtimeConnectionChange(setConnected), []);
    return connected;
};
