/** Course structure: Project (course) → Unit → Lesson → content items. */
export type LessonItemType = "document" | "quiz" | "deck" | "note" | "summary" | "question";

export interface LessonCounts {
    documents: number;
    quizzes: number;
    decks: number;
    notes: number;
    summaries: number;
    questions: number;
}

export interface CurriculumLesson {
    id: string;
    unit_id: string;
    title: string;
    description: string | null;
    order_index: number;
    counts: LessonCounts;
}

export interface CurriculumUnit {
    id: string;
    title: string;
    description: string | null;
    order_index: number;
    lessons: CurriculumLesson[];
}

export interface Curriculum {
    units: CurriculumUnit[];
    unsorted: Record<LessonItemType, number>;
}

export interface LessonDetail {
    id: string;
    project_id: string;
    unit_id: string;
    title: string;
    description: string | null;
    documents: { id: string; filename: string; file_type: string; status: string }[];
    quizzes: { id: string; title: string; mode: string; status: string }[];
    decks: { id: string; name: string; description: string | null }[];
    notes: { id: string; type: string }[];
    summaries: { id: string; level: string; status: string; document_id: string | null }[];
}

export interface CurriculumFormDto {
    title: string;
    description?: string;
}

export interface ReorderPayload {
    units: { id: string; lesson_ids: string[] }[];
}
