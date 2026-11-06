export interface ReadinessFactor {
    key: string;
    label: string;
    value: number | null;
    weight: number;
}

export interface Readiness {
    score: number;
    factors: ReadinessFactor[];
    blockers: string[];
    confidence: "low" | "medium" | "high";
}

export interface TopicScore {
    id: string;
    name: string;
    mastery: number;
}

export interface ProjectProgress {
    totals: {
        study_minutes: number;
        questions_answered: number;
        accuracy: number | null;
        average_score: number | null;
        attempts: number;
        cards_reviewed: number;
        retention: number | null;
        improvement_rate: number | null;
        recall_average: number | null;
    };
    daily: { date: string; minutes: number; questions: number; accuracy: number | null; cards: number }[];
    attempts: { index: number; id: string; title: string; mode: string; percentage: number; completed_at: string | null }[];
    flashcards: { by_rating: { rating: string; count: number }[] };
    by_difficulty: { difficulty: number; total: number; accuracy: number | null }[];
    strong_topics: TopicScore[];
    weak_topics: TopicScore[];
    readiness: Readiness;
}

export const PlanActivityTypes = {
    FLASHCARDS: "flashcards",
    ADAPTIVE_QUIZ: "adaptive_quiz",
    RECALL: "recall",
    EXAM: "exam",
    WEAK_TOPICS: "weak_topics",
} as const;
export type PlanActivityType = (typeof PlanActivityTypes)[keyof typeof PlanActivityTypes];

export interface StudyPlan {
    exam_date: string | null;
    days_remaining: number | null;
    target_score: number;
    readiness: number;
    recommended: { minutes_per_day: number; days_per_week: number };
    priority_topics: { id: string; name: string; mastery: number; attempts: number }[];
    schedule: {
        date: string;
        rest: boolean;
        minutes: number;
        focus_topic: { id: string; name: string } | null;
        activities: { type: PlanActivityType; minutes: number }[];
    }[];
    progress: { actual_week_minutes: number; planned_week_minutes: number; on_track: boolean };
    advice: string[];
    generated_at: string;
}
