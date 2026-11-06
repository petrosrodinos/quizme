import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { AnswerValue } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { answerGameSocket, createGame, getGame, nextQuestionSocket, startGameSocket } from "../services/games.services";

export const useGame = (id: string | undefined) => useQuery({ queryKey: ["game", id], queryFn: () => getGame(id!), enabled: !!id, retry: false, refetchOnWindowFocus: false });

export const useCreateGame = () =>
    useMutation({
        mutationFn: createGame,
        onSuccess: () => toast({ title: "Game lobby created", description: "Invite others to join from the room.", duration: 2000 }),
        onError: (error: Error) => toast({ title: "Could not start a game", description: error.message, variant: "error" }),
    });

export const useStartGame = () =>
    useMutation({
        mutationFn: startGameSocket,
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: "Could not start", description: error.message, variant: "error" }),
    });

export const useNextQuestion = () =>
    useMutation({
        mutationFn: nextQuestionSocket,
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: "Could not advance", description: error.message, variant: "error" }),
    });

export const useAnswerGame = (gameId: string) =>
    useMutation({
        mutationFn: ({ questionId, answer }: { questionId: string; answer: AnswerValue }) => answerGameSocket(gameId, questionId, answer),
        onSuccess: () => undefined,
        onError: (error: Error) => toast({ title: "Answer not accepted", description: error.message, variant: "error" }),
    });
