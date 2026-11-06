import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

export const AuditActions = {
    USER_REGISTERED: 'user.registered',
    USER_LOGIN: 'user.login',
    USER_LOGIN_FAILED: 'user.login_failed',
    USER_LOGOUT: 'user.logout',
    PASSWORD_CHANGED: 'user.password_changed',
    PASSWORD_RESET: 'user.password_reset',
    EMAIL_VERIFIED: 'user.email_verified',
    SESSION_REVOKED: 'user.session_revoked',
    ACCOUNT_DELETED: 'user.account_deleted',
    PROJECT_DELETED: 'project.deleted',
    PROJECT_ARCHIVED: 'project.archived',
    MEMBER_INVITED: 'project.member_invited',
    MEMBER_ROLE_CHANGED: 'project.member_role_changed',
    MEMBER_REMOVED: 'project.member_removed',
    SHARE_CREATED: 'share.created',
    SHARE_REVOKED: 'share.revoked',
    DOCUMENT_DELETED: 'document.deleted',
    DATA_EXPORTED: 'data.exported',
} as const;

/** Append-only audit trail for sensitive actions. Never throws into the request path. */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    log(entry: { userId?: string | null; action: string; resourceType?: string; resourceId?: string; ip?: string; metadata?: Record<string, unknown> }) {
        setImmediate(async () => {
            try {
                await this.prisma.auditLog.create({
                    data: {
                        user_id: entry.userId ?? null,
                        action: entry.action,
                        resource_type: entry.resourceType,
                        resource_id: entry.resourceId,
                        ip_address: entry.ip,
                        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue,
                    },
                });
            } catch (error) {
                this.logger.warn(`Audit log failed: ${error?.message}`);
            }
        });
    }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule { }
