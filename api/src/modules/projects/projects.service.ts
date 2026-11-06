import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MemberRole, Prisma, Project } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { FileTokenService } from '@/core/storage/file-token.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { AuditActions, AuditService } from '@/shared/audit/audit.service';
import { CreateProjectDto, ProjectQueryType, UpdateProjectDto } from './dto/projects.dto';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const imageMime = (key: string) => {
    const ext = key.split('.').pop()?.toLowerCase();
    return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
};

@Injectable()
export class ProjectsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly storage: StorageService,
        private readonly files: FileTokenService,
        private readonly audit: AuditService,
    ) { }

    serialize(project: Project, role?: MemberRole | null, extra: Record<string, unknown> = {}) {
        const { cover_image_key, ...rest } = project;
        return {
            ...rest,
            cover_url: cover_image_key ? this.files.signedUrl(cover_image_key, imageMime(cover_image_key), 'cover', 'inline', 6 * 3600) : null,
            my_role: role ?? null,
            ...extra,
        };
    }

    async create(userId: string, dto: CreateProjectDto) {
        const project = await this.prisma.project.create({
            data: {
                ...dto,
                exam_date: dto.exam_date ? new Date(dto.exam_date) : null,
                tags: this.cleanTags(dto.tags),
                owner_id: userId,
                members: { create: { user_id: userId, role: MemberRole.OWNER, can_copy: true, can_reshare: true } },
                decks: { create: { name: 'Main deck', created_by: userId } },
            },
        });
        return this.serialize(project, MemberRole.OWNER);
    }

    async list(userId: string, query: ProjectQueryType) {
        const where: Prisma.ProjectWhereInput = {
            members: { some: { user_id: userId } },
            ...(query.view === 'active' ? { archived_at: null } : query.view === 'archived' ? { archived_at: { not: null } } : {}),
            ...(query.search
                ? {
                    OR: [
                        { title: { contains: query.search, mode: 'insensitive' } },
                        { subject: { contains: query.search, mode: 'insensitive' } },
                        { tags: { has: query.search } },
                    ],
                }
                : {}),
        };
        const projects = await this.prisma.project.findMany({
            where,
            orderBy: { updated_at: 'desc' },
            include: {
                members: { where: { user_id: userId }, select: { role: true } },
                _count: { select: { documents: true, questions: true, flashcards: true, members: true } },
            },
            take: 200,
        });
        const ids = projects.map((p) => p.id);
        const due = ids.length
            ? await this.prisma.cardState.groupBy({
                by: ['project_id'],
                where: { user_id: userId, project_id: { in: ids }, due_at: { lte: new Date() } },
                _count: { _all: true },
            })
            : [];
        const newCards = ids.length
            ? await this.prisma.flashcard.groupBy({
                by: ['project_id'],
                where: { project_id: { in: ids }, states: { none: { user_id: userId } } },
                _count: { _all: true },
            })
            : [];
        const dueMap = new Map(due.map((d) => [d.project_id, d._count._all]));
        const newMap = new Map(newCards.map((d) => [d.project_id, d._count._all]));
        return projects.map(({ members, _count, ...p }) =>
            this.serialize(p as Project, members[0]?.role, {
                counts: { documents: _count.documents, questions: _count.questions, flashcards: _count.flashcards, members: _count.members },
                cards_due: (dueMap.get(p.id) ?? 0) + Math.min(newMap.get(p.id) ?? 0, 20),
            }),
        );
    }

    async get(userId: string, projectId: string) {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        const project = await this.prisma.project.findUniqueOrThrow({
            where: { id: projectId },
            include: {
                _count: { select: { documents: true, questions: true, flashcards: true, members: true, topics: true, notes: true, quizzes: true } },
                owner: { select: { id: true, full_name: true, email: true } },
            },
        });
        const { _count, owner, ...rest } = project;
        return this.serialize(rest as Project, access.role, { counts: _count, owner, can_copy: access.canCopy, can_reshare: access.canReshare });
    }

    async update(userId: string, projectId: string, dto: UpdateProjectDto) {
        const access = await this.access.assert(userId, projectId, 'EDIT');
        const project = await this.prisma.project.update({
            where: { id: projectId },
            data: {
                ...dto,
                exam_date: dto.exam_date === undefined ? undefined : dto.exam_date ? new Date(dto.exam_date) : null,
                tags: dto.tags ? this.cleanTags(dto.tags) : undefined,
            },
        });
        return this.serialize(project, access.role);
    }

    async setArchived(userId: string, projectId: string, archived: boolean, ip?: string) {
        const access = await this.access.assert(userId, projectId, 'MANAGE_MEMBERS');
        const project = await this.prisma.project.update({ where: { id: projectId }, data: { archived_at: archived ? new Date() : null } });
        if (archived) this.audit.log({ userId, action: AuditActions.PROJECT_ARCHIVED, resourceType: 'project', resourceId: projectId, ip });
        return this.serialize(project, access.role);
    }

    async remove(userId: string, projectId: string, ip?: string) {
        await this.access.assert(userId, projectId, 'DELETE_PROJECT');
        const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: { documents: { select: { storage_key: true } } } });
        await this.prisma.project.delete({ where: { id: projectId } });
        setImmediate(async () => {
            for (const d of project.documents) await this.storage.delete(d.storage_key);
            if (project.cover_image_key) await this.storage.delete(project.cover_image_key);
        });
        this.audit.log({ userId, action: AuditActions.PROJECT_DELETED, resourceType: 'project', resourceId: projectId, ip, metadata: { title: project.title } });
        return { success: true };
    }

    async setCover(userId: string, projectId: string, file: Express.Multer.File) {
        const access = await this.access.assert(userId, projectId, 'EDIT');
        if (!file) throw new BadRequestException('No file uploaded');
        if (!IMAGE_TYPES.includes(file.mimetype)) throw new BadRequestException('Cover must be a PNG, JPEG, WEBP or GIF image');
        if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Cover image must be under 5 MB');
        const key = this.storage.buildKey(`projects/${projectId}/cover`, file.originalname);
        await this.storage.put(key, file.buffer, file.mimetype);
        const previous = await this.prisma.project.findUnique({ where: { id: projectId }, select: { cover_image_key: true } });
        const project = await this.prisma.project.update({ where: { id: projectId }, data: { cover_image_key: key } });
        if (previous?.cover_image_key) void this.storage.delete(previous.cover_image_key);
        return this.serialize(project, access.role);
    }

    /**
     * Duplicates a project the user can copy: metadata, documents (files + processed chunks/embeddings, no re-processing cost),
     * topics, question bank, decks & flashcards. Personal progress and other users' notes are not copied.
     */
    async duplicate(userId: string, projectId: string) {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        if (!access.canCopy && access.role !== MemberRole.OWNER) throw new ForbiddenException('Copying this project is not allowed');
        const src = await this.prisma.project.findUniqueOrThrow({
            where: { id: projectId },
            include: { documents: { include: { chunks: true } }, topics: true, questions: true, decks: true, flashcards: true },
        });
        const copy = await this.prisma.project.create({
            data: {
                owner_id: userId,
                title: `${src.title} (copy)`.slice(0, 160),
                description: src.description,
                subject: src.subject,
                exam_date: src.exam_date,
                target_score: src.target_score,
                difficulty: src.difficulty,
                tags: src.tags,
                daily_minutes_goal: src.daily_minutes_goal,
                weekly_days_target: src.weekly_days_target,
                members: { create: { user_id: userId, role: MemberRole.OWNER, can_copy: true, can_reshare: true } },
            },
        });
        const topicMap = new Map<string, string>();
        const roots = src.topics.filter((t) => !t.parent_id);
        const children = src.topics.filter((t) => t.parent_id);
        for (const t of [...roots, ...children]) {
            const created = await this.prisma.topic.create({
                data: {
                    project_id: copy.id,
                    parent_id: t.parent_id ? topicMap.get(t.parent_id) ?? null : null,
                    name: t.name,
                    description: t.description,
                    order_index: t.order_index,
                    keywords: t.keywords,
                },
            });
            topicMap.set(t.id, created.id);
        }
        const docMap = new Map<string, string>();
        for (const d of src.documents) {
            const key = this.storage.buildKey(`projects/${copy.id}/documents`, d.filename);
            try {
                const buf = await this.storage.get(d.storage_key);
                await this.storage.put(key, buf, d.mime_type);
            } catch {
                continue;
            }
            const { id: _id, project_id: _p, chunks, created_at: _c, updated_at: _u, outline, ...docData } = d;
            const newDoc = await this.prisma.studyDocument.create({
                data: { ...docData, outline: outline ?? undefined, project_id: copy.id, uploaded_by: userId, storage_key: key },
            });
            docMap.set(d.id, newDoc.id);
            for (let i = 0; i < chunks.length; i += 500) {
                await this.prisma.documentChunk.createMany({
                    data: chunks.slice(i, i + 500).map(({ id: _cid, document_id: _d, project_id: _pp, topic_id, created_at: _cc, ...c }) => ({
                        ...c,
                        document_id: newDoc.id,
                        project_id: copy.id,
                        topic_id: topic_id ? topicMap.get(topic_id) ?? null : null,
                    })),
                });
            }
        }
        const deckMap = new Map<string, string>();
        for (const deck of src.decks) {
            const created = await this.prisma.flashcardDeck.create({ data: { project_id: copy.id, name: deck.name, description: deck.description, created_by: userId } });
            deckMap.set(deck.id, created.id);
        }
        if (!src.decks.length) await this.prisma.flashcardDeck.create({ data: { project_id: copy.id, name: 'Main deck', created_by: userId } });
        const remapRef = (ref: Prisma.JsonValue | null) => {
            if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return ref ?? undefined;
            const r = ref as Record<string, unknown>;
            return { ...r, document_id: r.document_id ? docMap.get(String(r.document_id)) ?? null : null } as Prisma.InputJsonValue;
        };
        if (src.questions.length) {
            await this.prisma.question.createMany({
                data: src.questions.map(({ id: _q, project_id: _p, topic_id, document_id, created_at: _c, updated_at: _u, data, original, source_ref, ...q }) => ({
                    ...q,
                    data: data as Prisma.InputJsonValue,
                    original: (original ?? undefined) as Prisma.InputJsonValue,
                    source_ref: remapRef(source_ref) as Prisma.InputJsonValue,
                    project_id: copy.id,
                    topic_id: topic_id ? topicMap.get(topic_id) ?? null : null,
                    document_id: document_id ? docMap.get(document_id) ?? null : null,
                    chunk_id: null,
                    created_by: userId,
                })),
                skipDuplicates: true,
            });
        }
        if (src.flashcards.length) {
            await this.prisma.flashcard.createMany({
                data: src.flashcards.map(({ id: _f, project_id: _p, deck_id, topic_id, created_at: _c, updated_at: _u, original, source_ref, ...f }) => ({
                    ...f,
                    original: (original ?? undefined) as Prisma.InputJsonValue,
                    source_ref: remapRef(source_ref) as Prisma.InputJsonValue,
                    project_id: copy.id,
                    deck_id: deck_id ? deckMap.get(deck_id) ?? null : null,
                    topic_id: topic_id ? topicMap.get(topic_id) ?? null : null,
                    chunk_id: null,
                    created_by: userId,
                })),
                skipDuplicates: true,
            });
        }
        return this.serialize(copy, MemberRole.OWNER);
    }

    private cleanTags(tags?: string[]) {
        return [...new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    }
}
