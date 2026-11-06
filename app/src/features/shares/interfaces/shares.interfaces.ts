import type { UserSummary } from "@/features/collaboration/interfaces/collaboration.interfaces";

export const ShareResourceTypes = {
    PROJECT: "PROJECT",
    DOCUMENT: "DOCUMENT",
    DECK: "DECK",
    QUIZ: "QUIZ",
    NOTE: "NOTE",
    STUDY_PLAN: "STUDY_PLAN",
} as const;
export type ShareResourceType = (typeof ShareResourceTypes)[keyof typeof ShareResourceTypes];

export const ShareTargetTypes = {
    USER: "USER",
    LINK: "LINK",
    ORGANIZATION: "ORGANIZATION",
} as const;
export type ShareTargetType = (typeof ShareTargetTypes)[keyof typeof ShareTargetTypes];

export const SharePermissions = {
    VIEW: "VIEW",
    EDIT: "EDIT",
} as const;
export type SharePermission = (typeof SharePermissions)[keyof typeof SharePermissions];

export interface Share {
    id: string;
    resource_type: ShareResourceType;
    resource_id: string;
    project_id: string;
    created_by: string;
    target_type: ShareTargetType;
    target_user_id: string | null;
    organization_id: string | null;
    permission: SharePermission;
    can_copy: boolean;
    can_reshare: boolean;
    expires_at: string | null;
    created_at: string;
    url: string | null;
    target_user?: UserSummary | null;
    organization?: { id: string; name: string } | null;
}

export interface CreateShareDto {
    resource_type: ShareResourceType;
    resource_id?: string;
    target_type: ShareTargetType;
    email?: string;
    organization_id?: string;
    permission?: SharePermission;
    can_copy?: boolean;
    can_reshare?: boolean;
    expires_in_days?: number;
}

/** Response of POST /projects/:id/shares — a Share, or an invitation when sharing a project with a person. */
export type CreateShareResult = Partial<Share> & { email?: string };

export interface ShareableResource {
    id: string;
    label: string;
}

export interface SharedWithMeItem extends Omit<Share, "url"> {
    sharer: UserSummary | null;
    title: string;
}

interface SharedViewBase {
    share_id: string;
    permission: SharePermission;
    can_copy: boolean;
    sharer: UserSummary | null;
    is_member: boolean;
    title: string;
}

export type SharedView = SharedViewBase &
    (
        | {
            resource_type: "PROJECT";
            content: { title: string; description: string | null; subject: string | null; tags: string[]; counts: { documents: number; questions: number; flashcards: number }; topics: string[] };
        }
        | { resource_type: "DECK"; content: { name: string; description: string | null; cards: { front: string; back: string; tags: string[] }[] } }
        | { resource_type: "QUIZ"; content: { title: string; mode: string; questions: { type: string; prompt: string; difficulty: number }[] } }
        | { resource_type: "NOTE"; content: { title: string | null; type: string; content: string; selection_text: string | null } }
        | {
            resource_type: "DOCUMENT";
            content: { filename: string; file_type: string; page_count: number | null; word_count: number | null; summary: string | null; view_url: string };
        }
        | { resource_type: "STUDY_PLAN"; content: { plan: StudyPlanSnapshot | null } }
    );

export interface StudyPlanSnapshot {
    exam_date?: string | null;
    days_remaining?: number | null;
    target_score?: number;
    readiness?: number;
    recommended?: { minutes_per_day: number; days_per_week: number };
    priority_topics?: { id: string; name: string; mastery: number }[];
    advice?: string[];
}

export interface CopySharedResult {
    kind: "project" | "deck" | "quiz" | "note";
    project_id: string;
    deck_id?: string;
    quiz_id?: string;
    note_id?: string;
}
