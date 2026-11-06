import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { closeRoom, createRoom, getRoom, getRooms, sendRoomMessage, sendTimerAction } from "../services/rooms.services";
import type { TimerAction, TimerMode } from "../interfaces/rooms.interfaces";

export const useRooms = (projectId?: string) => useQuery({ queryKey: ["rooms", projectId ?? "all"], queryFn: () => getRooms(projectId), refetchInterval: 30_000 });

export const useRoom = (id: string | undefined) => useQuery({ queryKey: ["room", id], queryFn: () => getRoom(id!), enabled: !!id, retry: false });

export const useCreateRoom = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createRoom,
        onSuccess: (room) => {
            qc.invalidateQueries({ queryKey: ["rooms"] });
            toast({ title: "Room created", description: room.name, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not create room", description: error.message, variant: "error" }),
    });
};

export const useCloseRoom = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: closeRoom,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["rooms"] });
            toast({ title: "Room closed", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not close room", description: error.message, variant: "error" }),
    });
};

export const useSendRoomMessage = (roomId: string) =>
    useMutation({
        mutationFn: (content: string) => sendRoomMessage(roomId, content),
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: "Message not sent", description: error.message, variant: "error" }),
    });

export const useRoomTimer = (roomId: string) =>
    useMutation({
        mutationFn: ({ action, minutes, mode }: { action: TimerAction; minutes?: number; mode?: TimerMode }) => sendTimerAction(roomId, action, minutes, mode),
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: "Timer update failed", description: error.message, variant: "error" }),
    });
