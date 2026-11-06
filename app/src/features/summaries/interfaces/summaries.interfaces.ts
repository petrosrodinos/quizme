export const SummaryLevels = {
    ONE_MINUTE: "ONE_MINUTE",
    FIVE_MINUTE: "FIVE_MINUTE",
    DETAILED: "DETAILED",
    CHEAT_SHEET: "CHEAT_SHEET",
    STUDY_GUIDE: "STUDY_GUIDE",
} as const;
export type SummaryLevel = (typeof SummaryLevels)[keyof typeof SummaryLevels];

export type SummaryStatus = "PENDING" | "GENERATING" | "READY" | "FAILED";

export interface Summary {
    id: string;
    project_id: string;
    document_id: string | null;
    level: SummaryLevel;
    status: SummaryStatus;
    content: string;
    model: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    cached?: boolean;
    document?: { id: string; filename: string } | null;
}

export interface CreateSummaryDto {
    level: SummaryLevel;
    document_id?: string;
    force?: boolean;
}
