import type { MemberRole, UserSummary } from "@/features/collaboration/interfaces/collaboration.interfaces";

export interface MyInvitation {
    id: string;
    project_id: string;
    email: string;
    role: MemberRole;
    status: string;
    expires_at: string;
    created_at: string;
    project: { id: string; title: string; subject: string | null };
    inviter: UserSummary | null;
}

export interface InvitationPreview {
    id: string;
    role: MemberRole;
    project: { id: string; title: string; subject: string | null; description: string | null };
    inviter: UserSummary | null;
    expires_at: string;
}

export interface AcceptInvitationResult {
    project_id: string;
}
