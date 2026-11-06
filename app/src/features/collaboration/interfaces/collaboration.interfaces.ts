export const MemberRoles = {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    EDITOR: "EDITOR",
    CONTRIBUTOR: "CONTRIBUTOR",
    VIEWER: "VIEWER",
} as const;
export type MemberRole = (typeof MemberRoles)[keyof typeof MemberRoles];

export interface UserSummary {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}

export interface ProjectMember {
    user: UserSummary;
    role: MemberRole;
    can_copy: boolean;
    can_reshare: boolean;
    joined_at: string;
    is_me: boolean;
}

export interface PendingInvitation {
    id: string;
    project_id: string;
    email: string;
    role: MemberRole;
    invited_by: string;
    status: string;
    expires_at: string;
    created_at: string;
}

export interface MembersResponse {
    my_role: MemberRole;
    members: ProjectMember[];
    invitations: PendingInvitation[];
}

export interface InviteMemberDto {
    email: string;
    role: Exclude<MemberRole, "OWNER">;
}

export interface UpdateMemberDto {
    role?: Exclude<MemberRole, "OWNER">;
    can_copy?: boolean;
    can_reshare?: boolean;
}
