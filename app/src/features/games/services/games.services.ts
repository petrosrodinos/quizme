import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import { realtimeEmit } from "@/features/realtime/services/realtime.services";
import type { AnswerValue } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { GameSocketEvents, type CreateGameDto, type GameState } from "../interfaces/games.interfaces";
import { tr } from "@/lib/i18n-options";

export const createGame = ({ projectId, dto }: { projectId: string; dto: CreateGameDto }) =>
    withApiError(async () => (await axiosInstance.post<GameState>(ApiRoutes.games.create(projectId), dto)).data, tr("games:errors.create"));

export const getGame = (id: string) => withApiError(async () => (await axiosInstance.get<GameState>(ApiRoutes.games.detail(id))).data, tr("games:errors.load"));

export const joinGameSocket = (gameId: string) => realtimeEmit<GameState>(GameSocketEvents.JOIN, { game_id: gameId });
export const startGameSocket = (gameId: string) => realtimeEmit<GameState>(GameSocketEvents.START, { game_id: gameId });
export const nextQuestionSocket = (gameId: string) => realtimeEmit(GameSocketEvents.NEXT, { game_id: gameId });
export const answerGameSocket = (gameId: string, questionId: string, answer: AnswerValue) =>
    realtimeEmit<{ is_correct: boolean; points: number }>(GameSocketEvents.ANSWER, { game_id: gameId, question_id: questionId, answer }, 30_000);
