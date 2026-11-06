import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma, Topic } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService, JobTypes } from '@/core/jobs/jobs.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { DomainEvents, TopicMasteredEvent } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { extractKeywords } from '@/integrations/ai/local/nlp.utils';
import { AiService } from '../ai/ai.service';

export const MASTERY_THRESHOLD = 85;
const MIN_ATTEMPTS_FOR_MASTERY = 5;

interface SectionInfo {
    key: string;
    title: string;
    text: string;
    chunkIds: string[];
}

export interface TopicNode {
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    keywords: string[];
    mastery: number;
    attempts: number;
    mastered: boolean;
    counts: { chunks: number; questions: number; flashcards: number };
    children: TopicNode[];
}

@Injectable()
export class TopicsService implements OnModuleInit {
    private readonly logger = new Logger(TopicsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ai: AiService,
        private readonly jobs: JobsService,
        private readonly access: ProjectAccessService,
        private readonly events: DomainEventsService,
    ) { }

    onModuleInit() {
        this.jobs.register(JobTypes.BUILD_TOPICS, (payload) => this.build(payload.projectId));
    }

    // ── Knowledge map construction (background) ──

    private async collectSections(projectId: string): Promise<SectionInfo[]> {
        const chunks = await this.prisma.documentChunk.findMany({
            where: { project_id: projectId },
            orderBy: [{ document_id: 'asc' }, { chunk_index: 'asc' }],
            select: { id: true, content: true, section_path: true, document_id: true, chunk_index: true, document: { select: { filename: true } } },
        });
        const sections = new Map<string, SectionInfo>();
        for (const c of chunks) {
            let key: string;
            let title: string;
            if (c.section_path.length) {
                const path = c.section_path.slice(0, 2);
                key = `${c.document_id}:${path.join('>')}`;
                title = path.join(' › ');
            } else {
                const window = Math.floor(c.chunk_index / 6);
                key = `${c.document_id}:w${window}`;
                title = `${c.document.filename.replace(/\.[^.]+$/, '')} (part ${window + 1})`;
            }
            if (!sections.has(key)) sections.set(key, { key, title, text: '', chunkIds: [] });
            const s = sections.get(key)!;
            s.chunkIds.push(c.id);
            if (s.text.length < 900) s.text += ` ${c.content.slice(0, 450)}`;
        }
        for (const s of sections.values()) {
            if (/\(part \d+\)$/.test(s.title)) {
                const kw = extractKeywords(s.text, 3);
                if (kw.length) s.title = kw.map((k) => k.replace(/\b\w/g, (m) => m.toUpperCase())).join(', ');
            }
        }
        return [...sections.values()].slice(0, 160);
    }

    async build(projectId: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, title: true, owner_id: true } });
        if (!project) return { skipped: true };
        const sections = await this.collectSections(projectId);
        if (!sections.length) return { topics: 0 };

        const tree = await this.ai.buildTopicTree({ projectId, userId: project.owner_id, task: 'topics' }, project.title, sections.map((s) => ({ title: s.title, text: s.text.trim() })));
        type Planned = { name: string; description: string; keywords: string[]; sections: number[]; children: Planned[] };
        let planned: Planned[];
        if (tree?.topics?.length) {
            planned = tree.topics.map((t) => ({
                name: t.name.slice(0, 80),
                description: t.description,
                keywords: t.keywords.slice(0, 8),
                sections: t.section_indices,
                children: t.subtopics.map((s) => ({ name: s.name.slice(0, 80), description: s.description, keywords: s.keywords.slice(0, 8), sections: s.section_indices, children: [] })),
            }));
        } else {
            const groups = new Map<string, number[]>();
            sections.forEach((s, i) => {
                const root = s.title.split(' › ')[0];
                if (!groups.has(root)) groups.set(root, []);
                groups.get(root)!.push(i);
            });
            planned = [...groups.entries()].slice(0, 12).map(([name, idx]) => ({
                name: name.slice(0, 80),
                description: '',
                keywords: extractKeywords(idx.map((i) => sections[i].text).join(' '), 6),
                sections: idx.filter((i) => !sections[i].title.includes(' › ')),
                children: idx
                    .filter((i) => sections[i].title.includes(' › '))
                    .slice(0, 8)
                    .map((i) => ({ name: sections[i].title.split(' › ')[1].slice(0, 80), description: '', keywords: extractKeywords(sections[i].text, 5), sections: [i], children: [] })),
            }));
        }

        const existing = await this.prisma.topic.findMany({ where: { project_id: projectId } });
        const findExisting = (name: string, parentId: string | null) =>
            existing.find((t) => t.name.toLowerCase() === name.toLowerCase() && t.parent_id === parentId);
        const keep = new Set<string>();
        const chunkTopic = new Map<string, string>();
        let order = 0;
        const upsert = async (node: Planned, parentId: string | null): Promise<Topic> => {
            const found = findExisting(node.name, parentId);
            const topic = found
                ? await this.prisma.topic.update({ where: { id: found.id }, data: { description: node.description || found.description, keywords: node.keywords, order_index: order++ } })
                : await this.prisma.topic.create({ data: { project_id: projectId, parent_id: parentId, name: node.name, description: node.description || null, keywords: node.keywords, order_index: order++ } });
            keep.add(topic.id);
            for (const idx of node.sections) sections[idx]?.chunkIds.forEach((cid) => chunkTopic.set(cid, topic.id));
            return topic;
        };
        for (const node of planned) {
            const parent = await upsert(node, null);
            for (const child of node.children) await upsert(child, parent.id);
            for (const idx of node.sections) sections[idx]?.chunkIds.forEach((cid) => chunkTopic.has(cid) || chunkTopic.set(cid, parent.id));
        }
        // Unassigned sections → best keyword match among planned topics.
        const allTopics = await this.prisma.topic.findMany({ where: { id: { in: [...keep] } } });
        for (const s of sections) {
            if (s.chunkIds.every((c) => chunkTopic.has(c))) continue;
            const text = s.text.toLowerCase();
            const best = allTopics
                .map((t) => ({ t, score: t.keywords.filter((k) => text.includes(k.toLowerCase())).length + (text.includes(t.name.toLowerCase()) ? 2 : 0) }))
                .sort((a, b) => b.score - a.score)[0];
            if (best?.score) s.chunkIds.forEach((c) => chunkTopic.has(c) || chunkTopic.set(c, best.t.id));
        }
        const byTopic = new Map<string, string[]>();
        chunkTopic.forEach((tid, cid) => (byTopic.has(tid) ? byTopic.get(tid)!.push(cid) : byTopic.set(tid, [cid])));
        await this.prisma.$transaction(
            [...byTopic.entries()].map(([topicId, ids]) => this.prisma.documentChunk.updateMany({ where: { id: { in: ids } }, data: { topic_id: topicId } })),
        );
        // Remove stale AI topics that have no progress attached.
        const stale = existing.filter((t) => !keep.has(t.id)).map((t) => t.id);
        if (stale.length) {
            const withMastery = await this.prisma.topicMastery.findMany({ where: { topic_id: { in: stale } }, select: { topic_id: true } });
            const protectedIds = new Set(withMastery.map((m) => m.topic_id));
            await this.prisma.topic.deleteMany({ where: { id: { in: stale.filter((id) => !protectedIds.has(id)) }, children: { none: {} } } });
        }
        await this.syncContentTopics(projectId);
        return { topics: keep.size, assigned_chunks: chunkTopic.size };
    }

    /** Re-derives question/flashcard topics from their source chunk. */
    private async syncContentTopics(projectId: string) {
        const chunks = await this.prisma.documentChunk.findMany({ where: { project_id: projectId, topic_id: { not: null } }, select: { id: true, topic_id: true } });
        const map = new Map(chunks.map((c) => [c.id, c.topic_id!]));
        const [questions, cards] = await Promise.all([
            this.prisma.question.findMany({ where: { project_id: projectId, chunk_id: { not: null }, topic_id: null }, select: { id: true, chunk_id: true } }),
            this.prisma.flashcard.findMany({ where: { project_id: projectId, chunk_id: { not: null }, topic_id: null }, select: { id: true, chunk_id: true } }),
        ]);
        const ops = [
            ...questions.filter((q) => map.has(q.chunk_id!)).map((q) => this.prisma.question.update({ where: { id: q.id }, data: { topic_id: map.get(q.chunk_id!) } })),
            ...cards.filter((c) => map.has(c.chunk_id!)).map((c) => this.prisma.flashcard.update({ where: { id: c.id }, data: { topic_id: map.get(c.chunk_id!) } })),
        ];
        for (let i = 0; i < ops.length; i += 200) await this.prisma.$transaction(ops.slice(i, i + 200));
    }

    // ── Mastery ──

    /**
     * Mastery = recency- and difficulty-weighted accuracy over the user's last 20 responses on the topic,
     * damped by a confidence factor until enough evidence exists. Call after the response is persisted.
     */
    async recordResult(userId: string, projectId: string, topicId: string | null) {
        if (!topicId) return;
        const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, name: true } });
        if (!topic) return;
        const [recent, totals, current] = await Promise.all([
            this.prisma.questionResponse.findMany({
                where: { user_id: userId, question: { topic_id: topicId } },
                orderBy: { answered_at: 'desc' },
                take: 20,
                select: { score: true, difficulty: true },
            }),
            this.prisma.questionResponse.groupBy({
                by: ['is_correct'],
                where: { user_id: userId, question: { topic_id: topicId } },
                _count: { _all: true },
            }),
            this.prisma.topicMastery.findUnique({ where: { user_id_topic_id: { user_id: userId, topic_id: topicId } } }),
        ]);
        const total = totals.reduce((s, t) => s + t._count._all, 0);
        const correct = totals.find((t) => t.is_correct)?._count._all ?? 0;
        let wSum = 0;
        let sSum = 0;
        recent.forEach((r, i) => {
            const w = Math.pow(0.9, i) * (0.6 + 0.1 * Math.min(5, Math.max(1, r.difficulty)));
            wSum += w;
            sSum += w * r.score;
        });
        const accuracy = wSum ? sSum / wSum : 0;
        const mastery = Math.round(100 * accuracy * Math.min(1, total / MIN_ATTEMPTS_FOR_MASTERY));
        const becameMastered = !current?.mastered_at && mastery >= MASTERY_THRESHOLD && total >= MIN_ATTEMPTS_FOR_MASTERY;
        await this.prisma.topicMastery.upsert({
            where: { user_id_topic_id: { user_id: userId, topic_id: topicId } },
            create: { user_id: userId, topic_id: topicId, project_id: projectId, mastery, correct, total, last_practiced_at: new Date(), mastered_at: becameMastered ? new Date() : null },
            update: { mastery, correct, total, last_practiced_at: new Date(), ...(becameMastered ? { mastered_at: new Date() } : {}) },
        });
        if (becameMastered) {
            this.events.emit<TopicMasteredEvent>(DomainEvents.TOPIC_MASTERED, { userId, projectId, topicId, topicName: topic.name });
        }
    }

    // ── API ──

    async tree(userId: string, projectId: string): Promise<TopicNode[]> {
        await this.access.assert(userId, projectId, 'VIEW');
        const [topics, mastery, chunkCounts, questionCounts, cardCounts] = await Promise.all([
            this.prisma.topic.findMany({ where: { project_id: projectId }, orderBy: { order_index: 'asc' } }),
            this.prisma.topicMastery.findMany({ where: { user_id: userId, project_id: projectId } }),
            this.prisma.documentChunk.groupBy({ by: ['topic_id'], where: { project_id: projectId }, _count: { _all: true } }),
            this.prisma.question.groupBy({ by: ['topic_id'], where: { project_id: projectId, archived_at: null }, _count: { _all: true } }),
            this.prisma.flashcard.groupBy({ by: ['topic_id'], where: { project_id: projectId }, _count: { _all: true } }),
        ]);
        const m = new Map(mastery.map((x) => [x.topic_id, x]));
        const count = (rows: { topic_id: string | null; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.topic_id, r._count._all]));
        const cc = count(chunkCounts);
        const qc = count(questionCounts);
        const fc = count(cardCounts);
        const nodes = new Map<string, TopicNode>();
        for (const t of topics) {
            const tm = m.get(t.id);
            nodes.set(t.id, {
                id: t.id,
                name: t.name,
                description: t.description,
                parent_id: t.parent_id,
                keywords: t.keywords,
                mastery: tm?.mastery ?? 0,
                attempts: tm?.total ?? 0,
                mastered: !!tm?.mastered_at,
                counts: { chunks: cc.get(t.id) ?? 0, questions: qc.get(t.id) ?? 0, flashcards: fc.get(t.id) ?? 0 },
                children: [],
            });
        }
        const roots: TopicNode[] = [];
        for (const node of nodes.values()) {
            if (node.parent_id && nodes.has(node.parent_id)) nodes.get(node.parent_id)!.children.push(node);
            else roots.push(node);
        }
        // Parent mastery aggregates its children (weighted by attempts) when it has no direct attempts.
        const aggregate = (n: TopicNode): { mastery: number; attempts: number } => {
            if (!n.children.length) return { mastery: n.mastery, attempts: n.attempts };
            const parts = n.children.map(aggregate);
            parts.push({ mastery: n.mastery, attempts: n.attempts });
            const withAttempts = parts.filter((p) => p.attempts > 0);
            if (withAttempts.length) {
                const total = withAttempts.reduce((s, p) => s + p.attempts, 0);
                n.mastery = Math.round(withAttempts.reduce((s, p) => s + p.mastery * p.attempts, 0) / total);
                n.attempts = total;
            }
            return { mastery: n.mastery, attempts: n.attempts };
        };
        roots.forEach(aggregate);
        return roots;
    }

    async flatMastery(userId: string, projectId: string) {
        const roots = await this.tree(userId, projectId);
        const out: Omit<TopicNode, 'children'>[] = [];
        const walk = (n: TopicNode, depth: number) => {
            const { children, ...rest } = n;
            out.push({ ...rest, ...({ depth } as any) });
            children.forEach((c) => walk(c, depth + 1));
        };
        roots.forEach((r) => walk(r, 0));
        return out;
    }

    async rebuild(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'EDIT');
        const job = await this.jobs.enqueue(JobTypes.BUILD_TOPICS, { projectId }, { userId, projectId, dedupeKey: `topics:${projectId}` });
        return { job_id: job.id };
    }

    async create(userId: string, projectId: string, dto: { name: string; description?: string; parent_id?: string }) {
        await this.access.assert(userId, projectId, 'EDIT');
        if (dto.parent_id) {
            const parent = await this.prisma.topic.findFirst({ where: { id: dto.parent_id, project_id: projectId } });
            if (!parent) throw new BadRequestException('Parent topic not found');
        }
        try {
            return await this.prisma.topic.create({
                data: { project_id: projectId, name: dto.name.trim(), description: dto.description, parent_id: dto.parent_id ?? null, keywords: extractKeywords(`${dto.name} ${dto.description ?? ''}`, 5) },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('A topic with this name already exists here');
            throw error;
        }
    }

    async update(userId: string, topicId: string, dto: { name?: string; description?: string }) {
        const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
        await this.access.assertResource(userId, topic, 'EDIT', 'Topic not found');
        return this.prisma.topic.update({ where: { id: topicId }, data: { name: dto.name?.trim() || undefined, description: dto.description } });
    }

    async remove(userId: string, topicId: string) {
        const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
        await this.access.assertResource(userId, topic, 'EDIT', 'Topic not found');
        await this.prisma.topic.delete({ where: { id: topicId } });
        return { success: true };
    }

    async get(userId: string, topicId: string) {
        const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, include: { children: true } });
        if (!topic) throw new NotFoundException('Topic not found');
        await this.access.assert(userId, topic.project_id, 'VIEW');
        const [mastery, chunks] = await Promise.all([
            this.prisma.topicMastery.findUnique({ where: { user_id_topic_id: { user_id: userId, topic_id: topicId } } }),
            this.prisma.documentChunk.findMany({
                where: { topic_id: topicId },
                take: 5,
                orderBy: { chunk_index: 'asc' },
                select: { id: true, content: true, page_start: true, document: { select: { id: true, filename: true } } },
            }),
        ]);
        return { ...topic, mastery: mastery?.mastery ?? 0, attempts: mastery?.total ?? 0, mastered: !!mastery?.mastered_at, sample_chunks: chunks };
    }
}
