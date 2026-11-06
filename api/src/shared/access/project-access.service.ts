import { ForbiddenException, Global, Injectable, Module, NotFoundException } from '@nestjs/common';
import { MemberRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

export const RoleRank: Record<MemberRole, number> = {
    OWNER: 5,
    ADMIN: 4,
    EDITOR: 3,
    CONTRIBUTOR: 2,
    VIEWER: 1,
};

/** Minimum role required for each capability. */
export const Capabilities = {
    VIEW: MemberRole.VIEWER,
    STUDY: MemberRole.VIEWER,
    CONTRIBUTE: MemberRole.CONTRIBUTOR,
    EDIT: MemberRole.EDITOR,
    MANAGE_MEMBERS: MemberRole.ADMIN,
    DELETE_PROJECT: MemberRole.OWNER,
} as const;

export type Capability = keyof typeof Capabilities;

export interface ProjectAccess {
    projectId: string;
    role: MemberRole;
    canCopy: boolean;
    canReshare: boolean;
}

/** Server-side authorization for every project-scoped resource (tenant isolation). */
@Injectable()
export class ProjectAccessService {
    constructor(private readonly prisma: PrismaService) { }

    async getAccess(userId: string, projectId: string): Promise<ProjectAccess | null> {
        const member = await this.prisma.projectMember.findUnique({
            where: { project_id_user_id: { project_id: projectId, user_id: userId } },
        });
        if (!member) return null;
        return { projectId, role: member.role, canCopy: member.can_copy, canReshare: member.can_reshare };
    }

    /** Throws 404 when the user has no access (avoids leaking existence) and 403 when the role is insufficient. */
    async assert(userId: string, projectId: string, capability: Capability = 'VIEW'): Promise<ProjectAccess> {
        const access = await this.getAccess(userId, projectId);
        if (!access) throw new NotFoundException('Project not found');
        if (!this.hasCapability(access.role, capability)) {
            throw new ForbiddenException('You do not have permission to perform this action');
        }
        return access;
    }

    hasCapability(role: MemberRole, capability: Capability): boolean {
        return RoleRank[role] >= RoleRank[Capabilities[capability]];
    }

    async projectIdsForUser(userId: string): Promise<string[]> {
        const rows = await this.prisma.projectMember.findMany({
            where: { user_id: userId, project: { archived_at: null } },
            select: { project_id: true },
        });
        return rows.map((r) => r.project_id);
    }

    /** Checks access for a project-owned record; 404 when missing. */
    async assertResource<T extends { project_id: string }>(
        userId: string,
        record: T | null,
        capability: Capability = 'VIEW',
        notFoundMessage = 'Resource not found',
    ): Promise<T> {
        if (!record) throw new NotFoundException(notFoundMessage);
        await this.assert(userId, record.project_id, capability);
        return record;
    }
}

@Global()
@Module({ providers: [ProjectAccessService], exports: [ProjectAccessService] })
export class AccessModule { }
