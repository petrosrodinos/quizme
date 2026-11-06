import type { ProjectHeader } from "./project-header.interfaces";

export const ProjectViews = {
    ACTIVE: "active",
    ARCHIVED: "archived",
    ALL: "all",
} as const;
export type ProjectView = (typeof ProjectViews)[keyof typeof ProjectViews];

export interface Project extends ProjectHeader {
    owner_id: string;
    daily_minutes_goal: number;
    weekly_days_target: number;
    created_at: string;
    updated_at: string;
    counts?: { documents: number; questions: number; flashcards: number; members: number };
    cards_due?: number;
}

/** A language a project can be created in. Served by the API so new languages need no app change. */
export interface ProjectLanguage {
    code: string;
    name: string;
    native_name: string;
}

export interface ProjectQuery {
    view?: ProjectView;
    search?: string;
}

export interface CreateProjectDto {
    title: string;
    description?: string;
    subject?: string;
    language?: string;
    exam_date?: string | null;
    target_score?: number;
    difficulty?: string;
    tags?: string[];
    status?: string;
    daily_minutes_goal?: number;
    weekly_days_target?: number;
}

export type UpdateProjectDto = Partial<CreateProjectDto>;

export interface ReadinessFactor {
    key: string;
    label: string;
    value: number | null;
    weight: number;
}

export interface RecommendationItem {
    type: string;
    label: string;
    minutes: number;
    link?: string | null;
}

export interface ProjectOverview {
    project?: Project;
    readiness?: { score: number; factors: ReadinessFactor[]; blockers: string[] };
    documents?: { total: number; ready: number; processing: number; failed: number };
    cards_due?: number;
    quiz_accuracy?: number | null;
    recent_attempts?: { id: string; quiz_title: string; percentage: number; completed_at: string }[];
    weak_topics?: { id: string; name: string; mastery: number }[];
    study_time_week_min?: number;
    exam?: { date: string | null; days_remaining: number | null };
    recommendation?: { title: string; items: RecommendationItem[] };
}
