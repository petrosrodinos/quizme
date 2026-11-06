/** Minimal project shape used by the project layout header. The projects page fork owns the full interfaces. */
export interface ProjectHeader {
    id: string;
    title: string;
    subject: string | null;
    /** Language of generated content and AI tutor replies (see GET /projects/languages). */
    language?: string;
    description: string | null;
    exam_date: string | null;
    target_score: number;
    difficulty: string;
    tags: string[];
    progress: number;
    status: string;
    cover_url?: string | null;
    my_role: "OWNER" | "ADMIN" | "EDITOR" | "CONTRIBUTOR" | "VIEWER";
    archived_at?: string | null;
    daily_minutes_goal?: number;
    weekly_days_target?: number;
    counts?: { members?: number; documents?: number; questions?: number; flashcards?: number };
}
