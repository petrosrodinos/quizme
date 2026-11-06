import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import { realtimeEmit } from "@/features/realtime/services/realtime.services";
import { RoomSocketEvents, type RoomDetail, type RoomMessage, type StudyRoom, type TimerAction, type TimerMode, type TimerState } from "../interfaces/rooms.interfaces";
import { tr } from "@/lib/i18n-options";

export const getRooms = (projectId?: string) =>
    withApiError(async () => (await axiosInstance.get<StudyRoom[]>(ApiRoutes.rooms.prefix, { params: { project_id: projectId || undefined } })).data, tr("rooms:errors.loadRooms"));

export const getRoom = (id: string) => withApiError(async () => (await axiosInstance.get<RoomDetail>(ApiRoutes.rooms.detail(id))).data, tr("rooms:errors.loadRoom"));

export const createRoom = ({ projectId, name }: { projectId: string; name: string }) =>
    withApiError(async () => (await axiosInstance.post<StudyRoom>(ApiRoutes.rooms.create(projectId), { name })).data, tr("rooms:errors.create"));

export const closeRoom = (id: string) => withApiError(async () => (await axiosInstance.post(ApiRoutes.rooms.close(id))).data, tr("rooms:errors.close"));

// Socket actions (acks carry data or {error}; realtimeEmit rejects on error).
export const joinRoomSocket = (roomId: string) => realtimeEmit<RoomDetail>(RoomSocketEvents.JOIN, { room_id: roomId });
export const leaveRoomSocket = (roomId: string) => realtimeEmit(RoomSocketEvents.LEAVE, { room_id: roomId });
export const sendRoomMessage = (roomId: string, content: string) => realtimeEmit<RoomMessage>(RoomSocketEvents.MESSAGE, { room_id: roomId, content });
export const sendTimerAction = (roomId: string, action: TimerAction, minutes?: number, mode?: TimerMode) =>
    realtimeEmit<TimerState>(RoomSocketEvents.TIMER, { room_id: roomId, action, minutes, mode });
export const saveRoomNotes = (roomId: string, content: string) => realtimeEmit(RoomSocketEvents.NOTES, { room_id: roomId, content });
