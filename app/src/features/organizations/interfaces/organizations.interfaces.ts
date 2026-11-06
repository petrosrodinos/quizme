import type { UserSummary } from "@/features/collaboration/interfaces/collaboration.interfaces";

export const OrgRoles = {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    MEMBER: "MEMBER",
} as const;
export type OrgRole = (typeof OrgRoles)[keyof typeof OrgRoles];

export interface Organization {
    id: string;
    name: string;
    slug: string;
    created_by: string;
    created_at: string;
    my_role: OrgRole;
    member_count: number;
}

export interface OrganizationMember {
    user: UserSummary;
    role: OrgRole;
    joined_at: string;
}

export interface AddOrgMemberDto {
    email: string;
    role?: OrgRole;
}
