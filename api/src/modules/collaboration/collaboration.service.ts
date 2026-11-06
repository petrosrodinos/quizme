import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus, MemberRole, OrgRole, Prisma, Share, SharePermission, ShareResourceType, ShareTargetType } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { FileTokenService } from '@/core/storage/file-token.service';
import { ProjectAccessService, RoleRank } from '@/shared/access/project-access.service';
import { AuditActions, AuditService } from '@/shared/audit/audit.service';
import { AppPaths, AppUrls } from '@/shared/config/app-urls';
import { DomainEvents } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { randomToken, sha256 } from '@/shared/utils/hash.utils';
import { MailService } from '@/integrations/notifications/mail/mail.service';
import { I18nService, msg, translate } from '@/shared/i18n/i18n.service';
import { NotificationsService, NotificationTypes } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { questionHash } from '../questions/questions.utils';
import { AddOrgMemberDto, CopySharedDto, CreateOrganizationDto, CreateShareDto, InviteMemberDto, UpdateMemberDto } from './dto/collaboration.dto';

const INVITE_TTL_DAYS = 14;
const userSelect = { id: true, email: true, full_name: true, avatar_url: true } as const;

@Injectable()
export class CollaborationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly audit: AuditService,
        private readonly events: DomainEventsService,
        private readonly notifications: NotificationsService,
        private readonly mail: MailService,
        private readonly projects: ProjectsService,
        private readonly files: FileTokenService,
        private readonly i18n: I18nService,
    ) { }

    // ── Members ──

    async members(userId: string, projectId: string) {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        const [members, invitations] = await Promise.all([
            this.prisma.projectMember.findMany({ where: { project_id: projectId }, include: { user: { select: userSelect } }, orderBy: { created_at: 'asc' } }),
            this.access.hasCapability(access.role, 'MANAGE_MEMBERS')
                ? this.prisma.projectInvitation.findMany({ where: { project_id: projectId, status: InvitationStatus.PENDING, expires_at: { gt: new Date() } }, orderBy: { created_at: 'desc' } })
                : Promise.resolve([]),
        ]);
        return {
            my_role: access.role,
            members: members.map((m) => ({ user: m.user, role: m.role, can_copy: m.can_copy, can_reshare: m.can_reshare, joined_at: m.created_at, is_me: m.user_id === userId })),
            invitations: invitations.map(({ token_hash: _t, ...i }) => i),
        };
    }

    async invite(userId: string, projectId: string, dto: InviteMemberDto, ip?: string) {
        const access = await this.access.assert(userId, projectId, 'MANAGE_MEMBERS');
        if (RoleRank[dto.role] > RoleRank[access.role] || (dto.role === MemberRole.ADMIN && access.role !== MemberRole.OWNER)) {
            throw new ForbiddenException('You cannot grant a role higher than your own');
        }
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser) {
            const member = await this.prisma.projectMember.findUnique({ where: { project_id_user_id: { project_id: projectId, user_id: existingUser.id } } });
            if (member) throw new ConflictException('This person is already a member');
        }
        const token = randomToken(24);
        await this.prisma.projectInvitation.updateMany({ where: { project_id: projectId, email: dto.email, status: InvitationStatus.PENDING }, data: { status: InvitationStatus.REVOKED } });
        const invitation = await this.prisma.projectInvitation.create({
            data: { project_id: projectId, email: dto.email, role: dto.role, token_hash: sha256(token), invited_by: userId, expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000) },
        });
        const [project, inviter] = await Promise.all([
            this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true } }),
            this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { full_name: true, email: true } }),
        ]);
        const inviterName = inviter.full_name || inviter.email;
        if (existingUser) {
            await this.notifications.notify({
                userId: existingUser.id,
                type: NotificationTypes.INVITATION,
                title: msg('notif.invitation.title', { inviter: inviterName, project: project.title }),
                body: msg('notif.invitation.body', { role: `@:role.${dto.role}` }),
                link: AppPaths.invitations,
                data: { invitation_id: invitation.id, project_id: projectId },
            });
        }
        setImmediate(async () => {
            try {
                // Invitee's language if they already have an account, otherwise the inviter's language.
                const lang = await this.i18n.languageOf(existingUser?.id ?? userId);
                const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
                const params = { inviter: inviterName, project: project.title, role: t(`role.${dto.role}`), days: INVITE_TTL_DAYS };
                await this.mail.send({
                    to: dto.email,
                    subject: t('email.invite.subject', params),
                    heading: t('email.invite.heading', params),
                    body: t('email.invite.body', params),
                    footer: t('email.footer'),
                    cta: { label: t('email.invite.cta'), url: AppUrls.acceptInvitation(token) },
                });
            } catch {
                /* email failures must not break the request */
            }
        });
        this.audit.log({ userId, action: AuditActions.MEMBER_INVITED, resourceType: 'project', resourceId: projectId, ip, metadata: { email: dto.email, role: dto.role } });
        const { token_hash: _t, ...rest } = invitation;
        return rest;
    }

    async revokeInvitation(userId: string, projectId: string, invitationId: string) {
        await this.access.assert(userId, projectId, 'MANAGE_MEMBERS');
        const res = await this.prisma.projectInvitation.updateMany({ where: { id: invitationId, project_id: projectId, status: InvitationStatus.PENDING }, data: { status: InvitationStatus.REVOKED } });
        if (!res.count) throw new NotFoundException('Invitation not found');
        return { success: true };
    }

    async myInvitations(userId: string) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
        const invites = await this.prisma.projectInvitation.findMany({
            where: { email: user.email, status: InvitationStatus.PENDING, expires_at: { gt: new Date() } },
            include: { project: { select: { id: true, title: true, subject: true } } },
            orderBy: { created_at: 'desc' },
        });
        const inviters = await this.prisma.user.findMany({ where: { id: { in: invites.map((i) => i.invited_by) } }, select: userSelect });
        return invites.map(({ token_hash: _t, ...i }) => ({ ...i, inviter: inviters.find((u) => u.id === i.invited_by) ?? null }));
    }

    private async resolveInvitation(userId: string, by: { token?: string; id?: string }) {
        const invitation = by.token
            ? await this.prisma.projectInvitation.findUnique({ where: { token_hash: sha256(by.token) }, include: { project: { select: { id: true, title: true, subject: true, description: true } } } })
            : await this.prisma.projectInvitation.findUnique({ where: { id: by.id! }, include: { project: { select: { id: true, title: true, subject: true, description: true } } } });
        if (!invitation) throw new NotFoundException('Invitation not found');
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
        if (invitation.email !== user.email) throw new ForbiddenException(`This invitation was sent to ${invitation.email}. Sign in with that account to accept it.`);
        if (invitation.status !== InvitationStatus.PENDING) throw new BadRequestException(`This invitation is ${invitation.status.toLowerCase()}`);
        if (invitation.expires_at < new Date()) {
            await this.prisma.projectInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.EXPIRED } });
            throw new BadRequestException('This invitation has expired');
        }
        return invitation;
    }

    async previewInvitation(userId: string, token: string) {
        const inv = await this.resolveInvitation(userId, { token });
        const inviter = await this.prisma.user.findUnique({ where: { id: inv.invited_by }, select: userSelect });
        return { id: inv.id, role: inv.role, project: inv.project, inviter, expires_at: inv.expires_at };
    }

    async acceptInvitation(userId: string, by: { token?: string; id?: string }) {
        const inv = await this.resolveInvitation(userId, by);
        await this.prisma.$transaction([
            this.prisma.projectMember.upsert({
                where: { project_id_user_id: { project_id: inv.project_id, user_id: userId } },
                create: { project_id: inv.project_id, user_id: userId, role: inv.role, invited_by: inv.invited_by, can_copy: true, can_reshare: RoleRank[inv.role] >= RoleRank.ADMIN },
                update: {},
            }),
            this.prisma.projectInvitation.update({ where: { id: inv.id }, data: { status: InvitationStatus.ACCEPTED, accepted_at: new Date() } }),
        ]);
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { full_name: true, email: true } });
        await this.notifications.notify({
            userId: inv.invited_by,
            type: NotificationTypes.COLLABORATION,
            title: msg('notif.memberJoined.title', { name: user.full_name || user.email, project: inv.project.title }),
            link: AppPaths.project(inv.project_id),
        });
        return { project_id: inv.project_id };
    }

    async declineInvitation(userId: string, id: string) {
        const inv = await this.resolveInvitation(userId, { id });
        await this.prisma.projectInvitation.update({ where: { id: inv.id }, data: { status: InvitationStatus.DECLINED } });
        return { success: true };
    }

    async updateMember(userId: string, projectId: string, memberUserId: string, dto: UpdateMemberDto, ip?: string) {
        const access = await this.access.assert(userId, projectId, 'MANAGE_MEMBERS');
        const target = await this.prisma.projectMember.findUnique({ where: { project_id_user_id: { project_id: projectId, user_id: memberUserId } } });
        if (!target) throw new NotFoundException('Member not found');
        if (target.role === MemberRole.OWNER) throw new ForbiddenException("The owner's role cannot be changed");
        if (memberUserId === userId) throw new BadRequestException('You cannot change your own role');
        if (RoleRank[target.role] >= RoleRank[access.role]) throw new ForbiddenException('You cannot modify a member with an equal or higher role');
        if (dto.role && (RoleRank[dto.role] >= RoleRank[access.role] && access.role !== MemberRole.OWNER)) throw new ForbiddenException('You cannot grant a role equal to or higher than your own');
        const updated = await this.prisma.projectMember.update({ where: { id: target.id }, data: dto });
        this.audit.log({ userId, action: AuditActions.MEMBER_ROLE_CHANGED, resourceType: 'project', resourceId: projectId, ip, metadata: { member: memberUserId, ...dto } });
        return updated;
    }

    /** Revoke access (or leave the project when removing yourself). */
    async removeMember(userId: string, projectId: string, memberUserId: string, ip?: string) {
        const target = await this.prisma.projectMember.findUnique({ where: { project_id_user_id: { project_id: projectId, user_id: memberUserId } } });
        if (!target) throw new NotFoundException('Member not found');
        if (target.role === MemberRole.OWNER) throw new ForbiddenException('The owner cannot be removed. Delete the project instead.');
        if (memberUserId !== userId) {
            const access = await this.access.assert(userId, projectId, 'MANAGE_MEMBERS');
            if (RoleRank[target.role] >= RoleRank[access.role]) throw new ForbiddenException('You cannot remove a member with an equal or higher role');
        }
        await this.prisma.projectMember.delete({ where: { id: target.id } });
        await this.prisma.share.updateMany({ where: { project_id: projectId, target_user_id: memberUserId, revoked_at: null }, data: { revoked_at: new Date() } });
        this.audit.log({ userId, action: AuditActions.MEMBER_REMOVED, resourceType: 'project', resourceId: projectId, ip, metadata: { member: memberUserId } });
        return { success: true };
    }

    // ── Shares ──

    private async assertResourceInProject(projectId: string, type: ShareResourceType, id: string) {
        const where = { id, project_id: projectId };
        const found =
            type === ShareResourceType.PROJECT || type === ShareResourceType.STUDY_PLAN
                ? id === projectId
                : type === ShareResourceType.DOCUMENT
                    ? await this.prisma.studyDocument.count({ where })
                    : type === ShareResourceType.DECK
                        ? await this.prisma.flashcardDeck.count({ where })
                        : type === ShareResourceType.QUIZ
                            ? await this.prisma.quiz.count({ where })
                            : await this.prisma.note.count({ where });
        if (!found) throw new NotFoundException('Resource not found in this project');
    }

    async createShare(userId: string, projectId: string, dto: CreateShareDto, ip?: string) {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        if (!access.canReshare && !this.access.hasCapability(access.role, 'MANAGE_MEMBERS')) throw new ForbiddenException('You are not allowed to share content from this project');
        const resourceId = dto.resource_id ?? projectId;
        await this.assertResourceInProject(projectId, dto.resource_type, resourceId);
        if (dto.resource_type === ShareResourceType.NOTE) {
            const note = await this.prisma.note.findUnique({ where: { id: resourceId } });
            if (note!.user_id !== userId) throw new ForbiddenException('You can only share your own notes');
        }
        const permission = dto.permission ?? SharePermission.VIEW;
        // Sharing a whole project with a specific person is a membership invitation.
        if (dto.resource_type === ShareResourceType.PROJECT && dto.target_type === ShareTargetType.USER) {
            if (!dto.email) throw new BadRequestException('Email required');
            return this.invite(userId, projectId, { email: dto.email, role: permission === SharePermission.EDIT ? MemberRole.EDITOR : MemberRole.VIEWER }, ip);
        }
        let targetUserId: string | null = null;
        let linkToken: string | null = null;
        if (dto.target_type === ShareTargetType.USER) {
            if (!dto.email) throw new BadRequestException('Email required');
            const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (!target) throw new NotFoundException('No QuizMe account with that email. Invite them to the project instead.');
            if (target.id === userId) throw new BadRequestException('You cannot share with yourself');
            targetUserId = target.id;
        } else if (dto.target_type === ShareTargetType.ORGANIZATION) {
            if (!dto.organization_id) throw new BadRequestException('Organization required');
            const membership = await this.prisma.organizationMember.findUnique({ where: { organization_id_user_id: { organization_id: dto.organization_id, user_id: userId } } });
            if (!membership) throw new ForbiddenException('You are not a member of that organization');
        } else linkToken = randomToken(18);

        const share = await this.prisma.share.create({
            data: {
                resource_type: dto.resource_type,
                resource_id: resourceId,
                project_id: projectId,
                created_by: userId,
                target_type: dto.target_type,
                target_user_id: targetUserId,
                organization_id: dto.organization_id ?? null,
                link_token: linkToken,
                permission,
                can_copy: dto.can_copy ?? true,
                can_reshare: dto.can_reshare ?? false,
                expires_at: dto.expires_in_days ? new Date(Date.now() + dto.expires_in_days * 86_400_000) : null,
            },
        });
        if (targetUserId) {
            const sharer = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { full_name: true, email: true } });
            await this.notifications.notify({
                userId: targetUserId,
                type: NotificationTypes.COLLABORATION,
                title: msg('notif.shared.title', { name: sharer.full_name || sharer.email, resource: translate(await this.i18n.languageOf(targetUserId), `resource.${dto.resource_type}`) }),
                link: `/shared/id/${share.id}`,
                data: { share_id: share.id },
            });
        }
        this.events.emit(DomainEvents.CONTENT_SHARED, { userId, projectId, resourceId });
        this.audit.log({ userId, action: AuditActions.SHARE_CREATED, resourceType: dto.resource_type, resourceId, ip, metadata: { target: dto.target_type } });
        return { ...share, url: linkToken ? AppUrls.sharedLink(linkToken) : null };
    }

    async listShares(userId: string, projectId: string) {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        const manage = this.access.hasCapability(access.role, 'MANAGE_MEMBERS');
        const shares = await this.prisma.share.findMany({
            where: { project_id: projectId, revoked_at: null, ...(manage ? {} : { created_by: userId }) },
            orderBy: { created_at: 'desc' },
            include: { organization: { select: { id: true, name: true } } },
        });
        const users = await this.prisma.user.findMany({ where: { id: { in: shares.map((s) => s.target_user_id).filter(Boolean) as string[] } }, select: userSelect });
        return shares.map((s) => ({ ...s, url: s.link_token ? AppUrls.sharedLink(s.link_token) : null, target_user: users.find((u) => u.id === s.target_user_id) ?? null }));
    }

    async revokeShare(userId: string, shareId: string, ip?: string) {
        const share = await this.prisma.share.findUnique({ where: { id: shareId } });
        if (!share || share.revoked_at) throw new NotFoundException('Share not found');
        if (share.created_by !== userId) await this.access.assert(userId, share.project_id, 'MANAGE_MEMBERS');
        await this.prisma.share.update({ where: { id: shareId }, data: { revoked_at: new Date() } });
        this.audit.log({ userId, action: AuditActions.SHARE_REVOKED, resourceType: share.resource_type, resourceId: share.resource_id, ip });
        return { success: true };
    }

    async sharedWithMe(userId: string) {
        const orgs = await this.prisma.organizationMember.findMany({ where: { user_id: userId }, select: { organization_id: true } });
        const shares = await this.prisma.share.findMany({
            where: {
                revoked_at: null,
                OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
                AND: [{ OR: [{ target_user_id: userId }, { organization_id: { in: orgs.map((o) => o.organization_id) } }] }],
                created_by: { not: userId },
            },
            orderBy: { created_at: 'desc' },
            take: 200,
        });
        const sharers = await this.prisma.user.findMany({ where: { id: { in: shares.map((s) => s.created_by) } }, select: userSelect });
        const out = [];
        for (const s of shares) out.push({ ...s, link_token: undefined, sharer: sharers.find((u) => u.id === s.created_by) ?? null, title: await this.resourceTitle(s) });
        return out;
    }

    private async resourceTitle(s: Share): Promise<string> {
        switch (s.resource_type) {
            case ShareResourceType.PROJECT:
            case ShareResourceType.STUDY_PLAN:
                return (await this.prisma.project.findUnique({ where: { id: s.project_id }, select: { title: true } }))?.title ?? 'Project';
            case ShareResourceType.DOCUMENT:
                return (await this.prisma.studyDocument.findUnique({ where: { id: s.resource_id }, select: { filename: true } }))?.filename ?? 'Document';
            case ShareResourceType.DECK:
                return (await this.prisma.flashcardDeck.findUnique({ where: { id: s.resource_id }, select: { name: true } }))?.name ?? 'Deck';
            case ShareResourceType.QUIZ:
                return (await this.prisma.quiz.findUnique({ where: { id: s.resource_id }, select: { title: true } }))?.title ?? 'Quiz';
            default:
                return (await this.prisma.note.findUnique({ where: { id: s.resource_id }, select: { title: true } }))?.title ?? 'Note';
        }
    }

    private async loadShare(userId: string, by: { token?: string; id?: string }): Promise<Share> {
        const share = by.token ? await this.prisma.share.findUnique({ where: { link_token: by.token } }) : await this.prisma.share.findUnique({ where: { id: by.id! } });
        if (!share || share.revoked_at || (share.expires_at && share.expires_at < new Date())) throw new NotFoundException('This shared link is no longer available');
        if (by.id && share.target_type !== ShareTargetType.LINK) {
            const allowed =
                share.target_user_id === userId ||
                share.created_by === userId ||
                (share.organization_id && (await this.prisma.organizationMember.findUnique({ where: { organization_id_user_id: { organization_id: share.organization_id, user_id: userId } } })));
            if (!allowed) throw new NotFoundException('This shared content is not available');
        }
        return share;
    }

    /** Read-only view of shared content (answers to quiz questions are never exposed). */
    async viewShared(userId: string, by: { token?: string; id?: string }) {
        const share = await this.loadShare(userId, by);
        const sharer = await this.prisma.user.findUnique({ where: { id: share.created_by }, select: userSelect });
        const meta = {
            share_id: share.id,
            project_id: share.project_id,
            resource_type: share.resource_type,
            permission: share.permission,
            can_copy: share.can_copy,
            sharer,
            is_member: !!(await this.access.getAccess(userId, share.project_id)),
            title: await this.resourceTitle(share),
        };
        switch (share.resource_type) {
            case ShareResourceType.PROJECT: {
                const p = await this.prisma.project.findUniqueOrThrow({
                    where: { id: share.project_id },
                    include: { _count: { select: { documents: true, questions: true, flashcards: true } }, topics: { where: { parent_id: null }, select: { name: true } } },
                });
                return { ...meta, content: { title: p.title, description: p.description, subject: p.subject, tags: p.tags, counts: p._count, topics: p.topics.map((t) => t.name) } };
            }
            case ShareResourceType.DECK: {
                const deck = await this.prisma.flashcardDeck.findUniqueOrThrow({ where: { id: share.resource_id }, include: { cards: { select: { front: true, back: true, tags: true }, take: 500 } } });
                return { ...meta, content: { name: deck.name, description: deck.description, cards: deck.cards } };
            }
            case ShareResourceType.QUIZ: {
                const quiz = await this.prisma.quiz.findUniqueOrThrow({ where: { id: share.resource_id }, include: { questions: { include: { question: { select: { type: true, prompt: true, difficulty: true } } }, orderBy: { order_index: 'asc' } } } });
                return { ...meta, content: { title: quiz.title, mode: quiz.mode, questions: quiz.questions.map((q) => q.question) } };
            }
            case ShareResourceType.NOTE: {
                const note = await this.prisma.note.findUniqueOrThrow({ where: { id: share.resource_id } });
                return { ...meta, content: { title: note.title, type: note.type, content: note.content, selection_text: note.selection_text } };
            }
            case ShareResourceType.DOCUMENT: {
                const doc = await this.prisma.studyDocument.findUniqueOrThrow({ where: { id: share.resource_id } });
                const summary = await this.prisma.summary.findFirst({ where: { document_id: doc.id, status: 'READY' }, orderBy: { created_at: 'desc' } });
                return {
                    ...meta,
                    content: {
                        filename: doc.filename,
                        file_type: doc.file_type,
                        page_count: doc.page_count,
                        word_count: doc.word_count,
                        summary: summary?.content ?? null,
                        view_url: this.files.signedUrl(doc.storage_key, doc.mime_type, doc.filename, 'inline', 1800),
                    },
                };
            }
            case ShareResourceType.STUDY_PLAN: {
                const plan = await this.prisma.studyPlan.findFirst({ where: { project_id: share.project_id, user_id: share.created_by } });
                return { ...meta, content: { plan: plan?.plan ?? null } };
            }
        }
    }

    /** Join a project through a project share link (EDIT links → editor, VIEW links → viewer). */
    async joinViaLink(userId: string, token: string) {
        const share = await this.loadShare(userId, { token });
        if (share.resource_type !== ShareResourceType.PROJECT) throw new BadRequestException('Only project links can be joined');
        const role = share.permission === SharePermission.EDIT ? MemberRole.EDITOR : MemberRole.VIEWER;
        await this.prisma.projectMember.upsert({
            where: { project_id_user_id: { project_id: share.project_id, user_id: userId } },
            create: { project_id: share.project_id, user_id: userId, role, invited_by: share.created_by, can_copy: share.can_copy, can_reshare: share.can_reshare },
            update: {},
        });
        return { project_id: share.project_id };
    }

    /** Copy shared content into the user's own project. */
    async copyShared(userId: string, by: { token?: string; id?: string }, dto: CopySharedDto) {
        const share = await this.loadShare(userId, by);
        if (!share.can_copy) throw new ForbiddenException('The owner does not allow copying this content');
        if (share.resource_type === ShareResourceType.PROJECT) {
            const temp = await this.prisma.projectMember.upsert({
                where: { project_id_user_id: { project_id: share.project_id, user_id: userId } },
                create: { project_id: share.project_id, user_id: userId, role: MemberRole.VIEWER, can_copy: true },
                update: {},
            });
            try {
                const copy = await this.projects.duplicate(userId, share.project_id);
                return { kind: 'project', project_id: copy.id };
            } finally {
                if (temp.created_at.getTime() > Date.now() - 60_000 && temp.role === MemberRole.VIEWER && temp.invited_by === null) {
                    await this.prisma.projectMember.delete({ where: { id: temp.id } }).catch(() => undefined);
                }
            }
        }
        if (!dto.target_project_id) throw new BadRequestException('Choose a destination project');
        await this.access.assert(userId, dto.target_project_id, 'CONTRIBUTE');
        switch (share.resource_type) {
            case ShareResourceType.DECK: {
                const deck = await this.prisma.flashcardDeck.findUniqueOrThrow({ where: { id: share.resource_id }, include: { cards: true } });
                const newDeck = await this.prisma.flashcardDeck.create({ data: { project_id: dto.target_project_id, name: translate(await this.i18n.languageOf(userId), 'deck.sharedCopy', { name: deck.name }), description: deck.description, created_by: userId } });
                await this.prisma.flashcard.createMany({
                    data: deck.cards.map((c) => ({
                        project_id: dto.target_project_id!,
                        deck_id: newDeck.id,
                        front: c.front,
                        back: c.back,
                        tags: c.tags,
                        category: c.category,
                        difficulty: c.difficulty,
                        origin: 'IMPORTED' as const,
                        content_hash: c.content_hash,
                        created_by: userId,
                    })),
                    skipDuplicates: true,
                });
                return { kind: 'deck', deck_id: newDeck.id, project_id: dto.target_project_id };
            }
            case ShareResourceType.QUIZ: {
                const quiz = await this.prisma.quiz.findUniqueOrThrow({ where: { id: share.resource_id }, include: { questions: { include: { question: true }, orderBy: { order_index: 'asc' } } } });
                const ids: string[] = [];
                for (const { question: q } of quiz.questions) {
                    const hash = questionHash(q.type, q.prompt);
                    const existing = await this.prisma.question.findUnique({ where: { project_id_content_hash: { project_id: dto.target_project_id, content_hash: hash } } });
                    const created =
                        existing ??
                        (await this.prisma.question.create({
                            data: {
                                project_id: dto.target_project_id,
                                type: q.type,
                                difficulty: q.difficulty,
                                prompt: q.prompt,
                                data: q.data as Prisma.InputJsonValue,
                                explanation: q.explanation,
                                concept: q.concept,
                                tags: q.tags,
                                origin: 'IMPORTED',
                                content_hash: hash,
                                created_by: userId,
                                source_ref: (q.source_ref ?? undefined) as Prisma.InputJsonValue,
                            },
                        }));
                    ids.push(created.id);
                }
                const newQuiz = await this.prisma.quiz.create({
                    data: {
                        project_id: dto.target_project_id,
                        created_by: userId,
                        title: translate(await this.i18n.languageOf(userId), 'quiz.title.sharedCopy', { title: quiz.title }),
                        mode: quiz.mode === 'EXAM' ? 'EXAM' : 'PRACTICE',
                        status: 'READY',
                        config: quiz.config as Prisma.InputJsonValue,
                        time_limit_sec: quiz.time_limit_sec,
                        target_score: quiz.target_score,
                        questions: { create: ids.map((id, i) => ({ question_id: id, order_index: i })) },
                    },
                });
                return { kind: 'quiz', quiz_id: newQuiz.id, project_id: dto.target_project_id };
            }
            case ShareResourceType.NOTE: {
                const note = await this.prisma.note.findUniqueOrThrow({ where: { id: share.resource_id } });
                const copy = await this.prisma.note.create({
                    data: { project_id: dto.target_project_id, user_id: userId, type: note.type, title: note.title, content: note.content, selection_text: note.selection_text, tags: note.tags },
                });
                return { kind: 'note', note_id: copy.id, project_id: dto.target_project_id };
            }
            default:
                throw new BadRequestException('This content type cannot be copied');
        }
    }

    // ── Organizations / groups ──

    async createOrganization(userId: string, dto: CreateOrganizationDto) {
        const base = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'org';
        const slug = `${base}-${randomToken(3)}`;
        return this.prisma.organization.create({ data: { name: dto.name.trim(), slug, created_by: userId, members: { create: { user_id: userId, role: OrgRole.OWNER } } } });
    }

    async myOrganizations(userId: string) {
        const rows = await this.prisma.organizationMember.findMany({ where: { user_id: userId }, include: { organization: { include: { _count: { select: { members: true } } } } } });
        return rows.map((r) => ({ ...r.organization, my_role: r.role, member_count: r.organization._count.members }));
    }

    async orgMembers(userId: string, orgId: string) {
        const me = await this.prisma.organizationMember.findUnique({ where: { organization_id_user_id: { organization_id: orgId, user_id: userId } } });
        if (!me) throw new NotFoundException('Organization not found');
        const members = await this.prisma.organizationMember.findMany({ where: { organization_id: orgId }, include: { user: { select: userSelect } } });
        return members.map((m) => ({ user: m.user, role: m.role, joined_at: m.created_at }));
    }

    async addOrgMember(userId: string, orgId: string, dto: AddOrgMemberDto) {
        const me = await this.prisma.organizationMember.findUnique({ where: { organization_id_user_id: { organization_id: orgId, user_id: userId } } });
        if (!me || me.role === OrgRole.MEMBER) throw new ForbiddenException('Only organization admins can add members');
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new NotFoundException('No QuizMe account with that email');
        return this.prisma.organizationMember.upsert({
            where: { organization_id_user_id: { organization_id: orgId, user_id: user.id } },
            create: { organization_id: orgId, user_id: user.id, role: dto.role === OrgRole.OWNER ? OrgRole.ADMIN : (dto.role ?? OrgRole.MEMBER) },
            update: {},
        });
    }

    async removeOrgMember(userId: string, orgId: string, memberId: string) {
        const me = await this.prisma.organizationMember.findUnique({ where: { organization_id_user_id: { organization_id: orgId, user_id: userId } } });
        if (!me) throw new NotFoundException('Organization not found');
        if (memberId !== userId && me.role === OrgRole.MEMBER) throw new ForbiddenException('Only organization admins can remove members');
        const target = await this.prisma.organizationMember.findUnique({ where: { organization_id_user_id: { organization_id: orgId, user_id: memberId } } });
        if (!target) throw new NotFoundException('Member not found');
        if (target.role === OrgRole.OWNER) throw new ForbiddenException('The owner cannot be removed');
        await this.prisma.organizationMember.delete({ where: { organization_id_user_id: { organization_id: orgId, user_id: memberId } } });
        return { success: true };
    }
}
