import { io, type Socket } from "socket.io-client";
import { environments } from "@/config/environments";
import { tr } from "@/lib/i18n-options";

type Handler = (payload: unknown) => void;

let socket: Socket | null = null;
let currentToken: string | null = null;
const handlers = new Map<string, Set<Handler>>();
const stateListeners = new Set<(connected: boolean) => void>();

const dispatch = (event: string, payload: unknown) => {
    handlers.get(event)?.forEach((h) => {
        try {
            h(payload);
        } catch (error) {
            console.error(`[realtime] handler for ${event} failed`, error);
        }
    });
};

/** Connects (or re-authenticates) the shared Socket.IO client. */
export const realtimeConnect = (token: string) => {
    if (socket && currentToken === token) {
        if (!socket.connected) socket.connect();
        return;
    }
    realtimeDisconnect();
    currentToken = token;
    socket = io(environments.SOCKET_URL, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: Infinity,
        timeout: 20_000,
    });
    socket.on("connect", () => stateListeners.forEach((l) => l(true)));
    socket.on("disconnect", () => stateListeners.forEach((l) => l(false)));
    socket.onAny((event: string, payload: unknown) => dispatch(event, payload));
};

export const realtimeDisconnect = () => {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
    stateListeners.forEach((l) => l(false));
};

export const realtimeOn = (event: string, handler: Handler) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
    return () => {
        handlers.get(event)?.delete(handler);
    };
};

/** Emits an event; resolves with the server acknowledgement (if any). */
export const realtimeEmit = <T = unknown>(event: string, payload?: unknown, timeoutMs = 10_000): Promise<T> =>
    new Promise((resolve, reject) => {
        if (!socket) return reject(new Error(tr("layout:realtime.unavailable")));
        socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, response: T) => {
            if (err) reject(new Error(tr("layout:realtime.timeout")));
            else if (response && typeof response === "object" && "error" in (response as object)) reject(new Error(String((response as unknown as { error: unknown }).error)));
            else resolve(response);
        });
    });

export const isRealtimeConnected = () => !!socket?.connected;

export const onRealtimeConnectionChange = (listener: (connected: boolean) => void) => {
    stateListeners.add(listener);
    return () => {
        stateListeners.delete(listener);
    };
};
