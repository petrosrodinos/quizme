/** Learning-domain events. Gamification, notifications and analytics subscribe to these
 * instead of being embedded in each feature's logic. */
export const DomainEvents = {
    QUESTION_ANSWERED: 'question.answered',
    QUIZ_COMPLETED: 'quiz.completed',
    CARD_REVIEWED: 'card.reviewed',
    RECALL_EVALUATED: 'recall.evaluated',
    TOPIC_MASTERED: 'topic.mastered',
    DAILY_SESSION_COMPLETED: 'daily_session.completed',
    STUDY_TIME_LOGGED: 'study_time.logged',
    ROOM_JOINED: 'room.joined',
    GAME_WON: 'game.won',
    CONTENT_SHARED: 'content.shared',
    DOCUMENT_READY: 'document.ready',
    DOCUMENT_FAILED: 'document.failed',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];

export interface QuestionAnsweredEvent {
    userId: string;
    projectId: string;
    questionId: string;
    responseId: string;
    attemptId?: string | null;
    isCorrect: boolean;
    difficulty: number;
    combo: number;
    previouslyMissed: boolean;
    isExam: boolean;
}

export interface QuizCompletedEvent {
    userId: string;
    projectId: string;
    attemptId: string;
    quizId: string;
    percentage: number;
    correct: number;
    total: number;
    isExam: boolean;
    previousBestExam?: number | null;
}

export interface CardReviewedEvent {
    userId: string;
    projectId: string;
    cardId: string;
    rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}

export interface RecallEvaluatedEvent {
    userId: string;
    projectId: string;
    recallId: string;
    mode: 'ACTIVE_RECALL' | 'TEACH_BACK';
    score: number;
}

export interface TopicMasteredEvent {
    userId: string;
    projectId: string;
    topicId: string;
    topicName: string;
}

export interface StudyTimeLoggedEvent {
    userId: string;
    projectId?: string | null;
    seconds: number;
}

export interface SimpleUserEvent {
    userId: string;
    projectId?: string | null;
    resourceId?: string | null;
}
