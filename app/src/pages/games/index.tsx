import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Gamepad2, Play, SkipForward, Trophy, Users } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useFeedback } from "@/hooks/use-feedback";
import { toast } from "@/hooks/use-toast";
import { celebrate } from "@/lib/celebrate";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { useRealtimeConnected, useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { useAnswerGame, useGame, useNextQuestion, useStartGame } from "@/features/games/hooks/use-games";
import { joinGameSocket } from "@/features/games/services/games.services";
import { GameStatuses, type GameState } from "@/features/games/interfaces/games.interfaces";
import type { AnswerValue } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { GameLeaderboard } from "./components/game-leaderboard";
import { GamePodium } from "./components/game-podium";
import { GameQuestion } from "./components/game-question";
import { translateGameError } from "@/features/games/utils/game-errors.utils";
import { tCount } from "@/lib/format";
import { useTranslation } from "react-i18next";

export default function GamePage() {
    const { t } = useTranslation("games");
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const me = useAuthStore((s) => s.user);
    const connected = useRealtimeConnected();
    const { play, reduceMotion } = useFeedback();
    const initial = useGame(gameId);
    const start = useStartGame();
    const next = useNextQuestion();
    const answer = useAnswerGame(gameId ?? "");
    const [game, setGame] = useState<GameState | null>(null);
    const [clockOffset, setClockOffset] = useState(0);
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
    const [locked, setLocked] = useState<Record<string, boolean>>({});
    const celebrated = useRef(false);
    const revealedFor = useRef<string | null>(null);
    usePageMetadata({ title: game?.quiz.title ? t("page.metaTitleWithQuiz", { quiz: game.quiz.title }) : t("page.metaTitle") });

    const apply = useCallback((state: GameState) => {
        setGame(state);
        setClockOffset(new Date(state.server_time).getTime() - Date.now());
    }, []);

    useEffect(() => {
        if (initial.data) apply(initial.data);
    }, [initial.data, apply]);

    // Subscribe to the game's socket room (and re-subscribe after reconnects).
    useEffect(() => {
        if (!gameId || !connected) return;
        joinGameSocket(gameId)
            .then(apply)
            .catch((e: Error) => toast({ title: t("toasts.joinFailed"), description: translateGameError(e.message), variant: "error" }));
    }, [gameId, connected, apply, t]);

    useRealtimeEvent<GameState>(RealtimeEvents.GAME_STATE, (state) => {
        if (state.id === gameId) apply(state);
    });

    const myId = me?.id;
    const question = game?.question ?? null;
    const reveal = game?.reveal && question && game.reveal.question_id === question.id ? game.reveal : null;

    // Feedback when the answer is revealed for the current question.
    useEffect(() => {
        if (!reveal || revealedFor.current === reveal.question_id) return;
        revealedFor.current = reveal.question_id;
        const mine = reveal.results.find((r) => r.user_id === myId);
        if (mine) play(mine.is_correct ? "correct" : "wrong");
    }, [reveal, myId, play]);

    // Final celebration for the winner.
    useEffect(() => {
        if (game?.status !== GameStatuses.FINISHED || celebrated.current) return;
        celebrated.current = true;
        const winner = game.players[0];
        if (winner && winner.user_id === myId && game.players.length > 1) {
            celebrate("big");
            play("finishPass");
        } else play("finishFail");
    }, [game?.status, game?.players, myId, play]);

    const lastTick = useRef<number | null>(null);
    const onTick = useCallback(
        (s: number) => {
            if (s > 0 && s <= 3 && lastTick.current !== s) {
                lastTick.current = s;
                play("timerTick");
            }
        },
        [play],
    );

    if (initial.isPending && !game)
        return (
            <Main width="narrow">
                <DetailSkeleton />
            </Main>
        );

    if (initial.isError && !game)
        return (
            <Main width="narrow">
                <EmptyState icon={Gamepad2} title={t("page.unavailable")} description={translateGameError(initial.error.message)} action={<Button onClick={() => navigate(Routes.rooms.root)}>{t("page.backToRooms")}</Button>} />
            </Main>
        );

    if (!game) return null;

    const isHost = game.host_id === myId;
    const qid = question?.id ?? "";
    const submit = () => {
        if (!question || locked[qid]) return;
        answer.mutate(
            { questionId: question.id, answer: answers[qid] ?? {} },
            {
                onSuccess: () => setLocked((l) => ({ ...l, [qid]: true })),
            },
        );
    };
    const iAnswered = !!locked[qid] || !!game.players.find((p) => p.user_id === myId)?.answered_current;
    const backLink = game.room_id ? Routes.rooms.detail(game.room_id) : Routes.rooms.root;

    return (
        <Main width="wide">
            <Link to={backLink} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> {t("page.leave")}
            </Link>
            <PageHeader eyebrow={t("page.metaTitle")} title={game.quiz.title} />

            {game.status === GameStatuses.LOBBY ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
                    <Users className="mx-auto h-10 w-10 text-primary" aria-hidden />
                    <h2 className="mt-3 font-display text-2xl">{t("lobby.title")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("lobby.info", { questions: tCount("question", game.total), seconds: game.seconds_per_question })}
                    </p>
                    <ul className="mt-6 flex flex-wrap justify-center gap-3" aria-label={t("lobby.players")}>
                        {game.players.map((p) => (
                            <li key={p.user_id} className="flex flex-col items-center gap-1">
                                <UserAvatar name={p.name} src={p.avatar_url} online />
                                <span className="max-w-20 truncate text-xs">{p.name}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-8">
                        {isHost ? (
                            <Button size="lg" onClick={() => start.mutate(game.id)} loading={start.isPending}>
                                <Play className="mr-2 h-4 w-4" /> {t("lobby.start", { players: tCount("player", game.players.length) })}
                            </Button>
                        ) : (
                            <p className="text-sm text-muted-foreground" role="status">
                                {t("lobby.waitingHost")}
                            </p>
                        )}
                    </div>
                </div>
            ) : game.status === GameStatuses.IN_PROGRESS ? (
                <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                    <section className="rounded-2xl border border-border bg-card p-6" aria-label={t("question.currentAria")}>
                        <GameQuestion
                            game={game}
                            clockOffset={clockOffset}
                            answered={iAnswered}
                            myAnswer={answers[qid] ?? {}}
                            onAnswerChange={(v) => setAnswers((a) => ({ ...a, [qid]: v }))}
                            onSubmit={submit}
                            submitting={answer.isPending}
                            reveal={reveal}
                            onTick={onTick}
                        />
                        {reveal && isHost ? (
                            <div className="mt-6 flex justify-end">
                                <Button variant="outline" onClick={() => next.mutate(game.id)} loading={next.isPending}>
                                    <SkipForward className="mr-2 h-4 w-4" /> {t("question.nextNow")}
                                </Button>
                            </div>
                        ) : null}
                        {reveal ? (
                            <p className="mt-4 text-center text-xs text-muted-foreground" role="status">
                                {t("question.nextSoon")}
                            </p>
                        ) : null}
                    </section>
                    <aside aria-label={t("rankings.liveAria")} className="space-y-3">
                        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("rankings.title")}</h2>
                        <GameLeaderboard players={game.players} myId={myId} reveal={reveal} showAnswered={!reveal} reduceMotion={reduceMotion} />
                    </aside>
                </div>
            ) : (
                <div className="mx-auto max-w-2xl space-y-8">
                    <div className="rounded-2xl border border-border bg-card p-8 text-center">
                        <Trophy className="mx-auto h-10 w-10 text-amber" aria-hidden />
                        <h2 className="mt-3 font-display text-3xl">
                            {game.players[0]?.user_id === myId && game.players.length > 1 ? t("finished.youWon") : t("finished.wins", { name: game.players[0]?.name ?? t("finished.someone") })}
                        </h2>
                        <GamePodium players={game.players} />
                    </div>
                    <GameLeaderboard players={game.players} myId={myId} reduceMotion={reduceMotion} />
                    <div className="flex justify-center">
                        <Button onClick={() => navigate(backLink)}>{t("finished.backToRoom")}</Button>
                    </div>
                </div>
            )}
        </Main>
    );
}
