import type { AnswerValue, CorrectAnswer, QuestionPayload } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { QuestionType, SourceRef } from "@/features/questions/interfaces/questions.interfaces";

export const GameStatuses = {
    LOBBY: "LOBBY",
    IN_PROGRESS: "IN_PROGRESS",
    FINISHED: "FINISHED",
} as const;
export type GameStatus = (typeof GameStatuses)[keyof typeof GameStatuses];

export interface GameQuestion {
    id: string;
    type: QuestionType;
    prompt: string;
    difficulty: number;
    concept: string | null;
    topic_id: string | null;
    source_ref: SourceRef | null;
    payload: QuestionPayload;
}

export interface GamePlayer {
    user_id: string;
    name: string;
    avatar_url: string | null;
    score: number;
    correct: number;
    answered_current: boolean;
    rank: number;
}

export interface GameReveal {
    question_id: string;
    correct_answer: CorrectAnswer | null;
    explanation: string | null;
    results: { user_id: string; is_correct: boolean; points: number; time_ms: number }[];
}

export interface GameState {
    id: string;
    project_id: string;
    room_id: string | null;
    host_id: string;
    status: GameStatus;
    quiz: { id: string; title: string };
    seconds_per_question: number;
    current_index: number;
    total: number;
    question: GameQuestion | null;
    deadline_at: string | null;
    server_time: string;
    players: GamePlayer[];
    my_answer: { question_id: string; is_correct: boolean; points: number; answer: AnswerValue } | null;
    reveal: GameReveal | null;
}

export interface CreateGameDto {
    quiz_id: string;
    room_id?: string;
    seconds_per_question?: number;
}

export const GameSocketEvents = {
    JOIN: "game:join",
    START: "game:start",
    ANSWER: "game:answer",
    NEXT: "game:next",
    STATE: "game:state",
} as const;
