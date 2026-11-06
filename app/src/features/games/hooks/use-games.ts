import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { AnswerValue } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { answerGameSocket, createGame, getGame, nextQuestionSocket, startGameSocket } from "../services/games.services";
import { translateGameError } from "../utils/game-errors.utils";
import { tr } from "@/lib/i18n-options";

export const useGame = (id: string | undefined) => useQuery({ queryKey: ["game", id], queryFn: () => getGame(id!), enabled: !!id, retry: false, refetchOnWindowFocus: false });

export const useCreateGame = () =>
    useMutation({
        mutationFn: createGame,
        onSuccess: () => toast({ title: tr("games:toasts.lobbyCreated.title"), description: tr("games:toasts.lobbyCreated.description"), duration: 2000 }),
        onError: (error: Error) => toast({ title: tr("games:toasts.createFailed"), description: translateGameError(error.message), variant: "error" }),
    });

export const useStartGame = () =>
    useMutation({
        mutationFn: startGameSocket,
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: tr("games:toasts.startFailed"), description: translateGameError(error.message), variant: "error" }),
    });

export const useNextQuestion = () =>
    useMutation({
        mutationFn: nextQuestionSocket,
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: tr("games:toasts.advanceFailed"), description: translateGameError(error.message), variant: "error" }),
    });

export const useAnswerGame = (gameId: string) =>
    useMutation({
        mutationFn: ({ questionId, answer }: { questionId: string; answer: AnswerValue }) => answerGameSocket(gameId, questionId, answer),
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: tr("games:toasts.answerFailed"), description: translateGameError(error.message), variant: "error" }),
    });
