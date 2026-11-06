import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import { realtimeEmit } from "@/features/realtime/services/realtime.services";
import type { AnswerValue } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { GameSocketEvents, type CreateGameDto, type GameState } from "../interfaces/games.interfaces";

export const createGame = ({ projectId, dto }: { projectId: string; dto: CreateGameDto }) =>
    withApiError(async () => (await axiosInstance.post<GameState>(ApiRoutes.games.create(projectId), dto)).data, "Failed to create game.");

export const getGame = (id: string) => withApiError(async () => (await axiosInstance.get<GameState>(ApiRoutes.games.detail(id))).data, "Failed to load game.");

export const joinGameSocket = (gameId: string) => realtimeEmit<GameState>(GameSocketEvents.JOIN, { game_id: gameId });
export const startGameSocket = (gameId: string) => realtimeEmit<GameState>(GameSocketEvents.START, { game_id: gameId });
export const nextQuestionSocket = (gameId: string) => realtimeEmit(GameSocketEvents.NEXT, { game_id: gameId });
export const answerGameSocket = (gameId: string, questionId: string, answer: AnswerValue) =>
    realtimeEmit<{ is_correct: boolean; points: number }>(GameSocketEvents.ANSWER, { game_id: gameId, question_id: questionId, answer }, 30_000);
