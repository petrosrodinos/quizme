import type { GamificationProfile } from "@/features/gamification/interfaces/gamification.interfaces";
import type { DailySession } from "@/features/study/interfaces/study.interfaces";

export interface DashboardWeakTopic {
    id: string;
    name: string;
    mastery: number;
    project_id: string;
}

export interface DashboardProject {
    id: string;
    title: string;
    subject: string | null;
    exam_date: string | null;
    days_to_exam: number | null;
    progress: number;
    readiness: number;
    cards_due: number;
    weak_topics: DashboardWeakTopic[];
}

export interface DashboardScore {
    id: string;
    project_id: string;
    quiz_title: string;
    mode: string;
    percentage: number;
    completed_at: string | null;
}

export interface Dashboard {
    greeting: string;
    today: { session: DailySession; goal_progress: number; minutes: number };
    gamification: GamificationProfile;
    flashcards_due: number;
    quiz_accuracy: number | null;
    exam_readiness: number | null;
    study_time: { today_min: number; week_min: number };
    active_projects: DashboardProject[];
    upcoming_exams: DashboardProject[];
    recent_scores: DashboardScore[];
    weak_topics: DashboardWeakTopic[];
    overall_progress: number;
    week: { date: string; minutes: number; xp: number; goal_met: boolean }[];
}
