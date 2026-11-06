import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, DoorClosed, Gamepad2, Volume2, VolumeX, WifiOff } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useFeedback } from "@/hooks/use-feedback";
import { toast } from "@/hooks/use-toast";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { useRealtimeConnected, useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { useCloseRoom } from "@/features/rooms/hooks/use-rooms";
import { joinRoomSocket, leaveRoomSocket } from "@/features/rooms/services/rooms.services";
import type { PresenceUser, RoomDetail, RoomMessage, RoomPresencePayload, RoomStatePatch } from "@/features/rooms/interfaces/rooms.interfaces";
import { RoomChat } from "./components/room-chat";
import { RoomTimer } from "./components/room-timer";
import { RoomNotes } from "./components/room-notes";
import { StartGameDialog } from "./components/start-game-dialog";
import { translateRoomError } from "@/features/rooms/utils/room-errors.utils";
import { useTranslation } from "react-i18next";

export default function RoomDetailPage() {
    const { t } = useTranslation("rooms");
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const me = useAuthStore((s) => s.user);
    const connected = useRealtimeConnected();
    const { play } = useFeedback();
    const close = useCloseRoom();
    const [room, setRoom] = useState<RoomDetail | null>(null);
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [online, setOnline] = useState<PresenceUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [closed, setClosed] = useState(false);
    // Room sounds are off by default (shared spaces) and only play when the user opts in.
    const [soundsOn, setSoundsOn] = useState(false);
    const [gameOpen, setGameOpen] = useState(false);
    const [closeOpen, setCloseOpen] = useState(false);
    usePageMetadata({ title: room?.name ?? t("detail.metaTitle") });

    // Join (and re-join after reconnects); leave on unmount.
    useEffect(() => {
        if (!roomId || !connected) return;
        let active = true;
        joinRoomSocket(roomId)
            .then((state) => {
                if (!active) return;
                setRoom(state);
                setMessages(state.messages);
                setOnline(state.online);
                setError(null);
            })
            .catch((e: Error) => active && setError(translateRoomError(e.message)));
        return () => {
            active = false;
            leaveRoomSocket(roomId).catch(() => undefined);
        };
    }, [roomId, connected]);

    useRealtimeEvent<RoomMessage>(RealtimeEvents.ROOM_MESSAGE, (m) => {
        if (m.room_id !== roomId) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (soundsOn && (m.user_id !== me?.id || m.is_ai)) play("xp");
    });
    useRealtimeEvent<RoomPresencePayload>(RealtimeEvents.ROOM_PRESENCE, (p) => {
        if (p.room_id === roomId) setOnline(p.users);
    });
    useRealtimeEvent<RoomStatePatch>(RealtimeEvents.ROOM_STATE, (patch) => {
        if (patch.id !== roomId) return;
        if (patch.closed) {
            setClosed(true);
            return;
        }
        setRoom((r) =>
            r
                ? {
                    ...r,
                    timer_state: patch.timer_state ?? r.timer_state,
                    shared_notes: patch.shared_notes !== undefined && patch.notes_updated_by !== me?.id ? patch.shared_notes : r.shared_notes,
                    active_game: patch.active_game ?? r.active_game,
                }
                : r,
        );
        if (patch.active_game && patch.active_game.status === "LOBBY") toast({ title: t("detail.toasts.gameStarting.title"), description: t("detail.toasts.gameStarting.description"), duration: 4000 });
    });

    const onTimerFinished = useCallback(() => {
        if (soundsOn) play("goal");
        toast({ title: t("detail.toasts.timerFinished.title"), description: t("detail.toasts.timerFinished.description"), duration: 4000 });
    }, [soundsOn, play, t]);

    if (closed)
        return (
            <Main width="narrow">
                <EmptyState icon={DoorClosed} title={t("detail.closed")} action={<Button onClick={() => navigate(Routes.rooms.root)}>{t("detail.backToRooms")}</Button>} />
            </Main>
        );

    if (error)
        return (
            <Main width="narrow">
                <EmptyState icon={DoorClosed} title={t("detail.cantOpen")} description={error} action={<Button onClick={() => navigate(Routes.rooms.root)}>{t("detail.backToRooms")}</Button>} />
            </Main>
        );

    if (!room)
        return (
            <Main>
                {!connected ? (
                    <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                        <WifiOff className="h-4 w-4" /> {t("detail.connecting")}
                    </p>
                ) : null}
                <DetailSkeleton />
            </Main>
        );

    const isCreator = room.created_by === me?.id;
    const activeGame = room.active_game && room.active_game.status !== "FINISHED" ? room.active_game : null;

    return (
        <Main width="wide">
            <Link to={Routes.rooms.root} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> {t("detail.allRooms")}
            </Link>
            <PageHeader
                eyebrow={room.project?.title}
                title={room.name}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSoundsOn((v) => !v)} aria-pressed={soundsOn} aria-label={soundsOn ? t("detail.muteSounds") : t("detail.enableSounds")}>
                            {soundsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" onClick={() => setGameOpen(true)}>
                            <Gamepad2 className="mr-2 h-4 w-4" /> {t("detail.multiplayer")}
                        </Button>
                        {isCreator ? (
                            <Button variant="ghost" onClick={() => setCloseOpen(true)}>
                                {t("detail.closeRoom")}
                            </Button>
                        ) : null}
                    </div>
                }
            />
            {!connected ? (
                <p className="mb-4 flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm" role="status">
                    <WifiOff className="h-4 w-4" /> {t("detail.reconnecting")}
                </p>
            ) : null}
            {activeGame ? (
                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                    <Gamepad2 className="h-5 w-5 text-primary" aria-hidden />
                    <p className="flex-1 text-sm font-medium">{activeGame.status === "LOBBY" ? t("detail.banner.lobbyOpen") : t("detail.banner.inProgress")}</p>
                    <Button size="sm" onClick={() => navigate(Routes.game(activeGame.id))}>
                        {activeGame.status === "LOBBY" ? t("detail.banner.joinLobby") : t("detail.banner.watchJoin")}
                    </Button>
                </div>
            ) : null}
            <div className="mb-6 flex flex-wrap items-center gap-2" aria-label={t("detail.peopleAria")}>
                <span className="mr-1 text-sm text-muted-foreground">{t("detail.hereNow", { count: online.length })}</span>
                {online.map((u) => (
                    <span key={u.id} title={u.name}>
                        <UserAvatar name={u.name} src={u.avatar_url} online className="h-8 w-8" />
                    </span>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <RoomChat roomId={room.id} myId={me?.id} messages={messages} disabled={!connected} />
                <div className="space-y-6">
                    <RoomTimer roomId={room.id} timer={room.timer_state} onFinished={onTimerFinished} />
                    <RoomNotes roomId={room.id} content={room.shared_notes} />
                </div>
            </div>
            <StartGameDialog projectId={room.project_id} roomId={room.id} open={gameOpen} onOpenChange={setGameOpen} onCreated={(g) => navigate(Routes.game(g.id))} />
            <ConfirmationDialog
                isOpen={closeOpen}
                onClose={() => setCloseOpen(false)}
                onConfirm={() => close.mutate(room.id, { onSuccess: () => navigate(Routes.rooms.root) })}
                isLoading={close.isPending}
                variant="destructive"
                title={t("detail.closeConfirm.title")}
                description={t("detail.closeConfirm.description")}
                confirmText={t("detail.closeRoom")}
            />
        </Main>
    );
}
