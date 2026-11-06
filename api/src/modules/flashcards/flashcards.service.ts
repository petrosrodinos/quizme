import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CardState, CardStatus, ContentOrigin, Flashcard, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService, JobTypes, PermanentJobError } from '@/core/jobs/jobs.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { CardReviewedEvent, DomainEvents } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { paginate } from '@/shared/utils/pagination.utils';
import { sha256 } from '@/shared/utils/hash.utils';
import { recordStudySession } from '@/shared/utils/study-session.utils';
import { AiService } from '../ai/ai.service';
import { Passage, toSourceRef } from '../ai/ai.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { CreateDeckDto, CreateFlashcardDto, FlashcardQueryType, GenerateFlashcardsDto, ReviewCardDto, ReviewQueryType, UpdateDeckDto, UpdateFlashcardDto } from './dto/flashcards.dto';
import { previewIntervals, schedule } from './srs.utils';

const cardHash = (front: string) => sha256(front.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());

const DEFAULT_STATE = { status: CardStatus.NEW, ease: 2.5, interval_days: 0, repetitions: 0, lapses: 0, learning_step: 0 };

@Injectable()
export class FlashcardsService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly jobs: JobsService,
        private readonly realtime: RealtimeService,
        private readonly events: DomainEventsService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
    ) { }

    onModuleInit() {
        this.jobs.register(JobTypes.GENERATE_FLASHCARDS, (payload, ctx) => this.runGeneration(payload, ctx.job.id));
    }

    private serialize(card: Flashcard, state?: CardState | null) {
        const { content_hash: _h, original: _o, ...rest } = card;
        const s = state ?? null;
        return {
            ...rest,
            state: s
                ? { status: s.status, due_at: s.due_at, interval_days: s.interval_days, ease: s.ease, lapses: s.lapses, repetitions: s.repetitions, last_reviewed_at: s.last_reviewed_at, last_rating: s.last_rating }
                : { status: CardStatus.NEW, due_at: null, interval_days: 0, ease: 2.5, lapses: 0, repetitions: 0, last_reviewed_at: null, last_rating: null },
        };
    }

    // ── Decks ──

    async decks(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const decks = await this.prisma.flashcardDeck.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'asc' }, include: { _count: { select: { cards: true } } } });
        const due = await this.prisma.cardState.groupBy({
            by: ['card_id'],
            where: { user_id: userId, project_id: projectId, due_at: { lte: new Date() } },
        });
        const dueIds = new Set(due.map((d) => d.card_id));
        const cards = await this.prisma.flashcard.findMany({ where: { project_id: projectId }, select: { id: true, deck_id: true } });
        return decks.map(({ _count, ...d }) => ({ ...d, card_count: _count.cards, due_count: cards.filter((c) => c.deck_id === d.id && dueIds.has(c.id)).length }));
    }

    async createDeck(userId: string, projectId: string, dto: CreateDeckDto) {
        await this.access.assert(userId, projectId, 'CONTRIBUTE');
        return this.prisma.flashcardDeck.create({ data: { project_id: projectId, name: dto.name.trim(), description: dto.description, created_by: userId } });
    }

    async updateDeck(userId: string, deckId: string, dto: UpdateDeckDto) {
        await this.access.assertResource(userId, await this.prisma.flashcardDeck.findUnique({ where: { id: deckId } }), 'EDIT', 'Deck not found');
        return this.prisma.flashcardDeck.update({ where: { id: deckId }, data: dto });
    }

    async removeDeck(userId: string, deckId: string) {
        await this.access.assertResource(userId, await this.prisma.flashcardDeck.findUnique({ where: { id: deckId } }), 'EDIT', 'Deck not found');
        await this.prisma.$transaction([this.prisma.flashcard.deleteMany({ where: { deck_id: deckId } }), this.prisma.flashcardDeck.delete({ where: { id: deckId } })]);
        return { success: true };
    }

    private async defaultDeck(projectId: string, userId: string) {
        return (
            (await this.prisma.flashcardDeck.findFirst({ where: { project_id: projectId }, orderBy: { created_at: 'asc' } })) ??
            (await this.prisma.flashcardDeck.create({ data: { project_id: projectId, name: 'Main deck', created_by: userId } }))
        );
    }

    // ── Cards ──

    async list(userId: string, projectId: string, q: FlashcardQueryType) {
        await this.access.assert(userId, projectId, 'VIEW');
        const where: Prisma.FlashcardWhereInput = {
            project_id: projectId,
            ...(q.deck_id ? { deck_id: q.deck_id } : {}),
            ...(q.topic_id ? { topic_id: q.topic_id } : {}),
            ...(q.tag ? { tags: { has: q.tag } } : {}),
            ...(q.search ? { OR: [{ front: { contains: q.search, mode: 'insensitive' } }, { back: { contains: q.search, mode: 'insensitive' } }] } : {}),
            ...(q.status === CardStatus.NEW ? { states: { none: { user_id: userId } } } : q.status ? { states: { some: { user_id: userId, status: q.status } } } : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.flashcard.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (q.page - 1) * q.limit,
                take: q.limit,
                include: { states: { where: { user_id: userId } }, topic: { select: { id: true, name: true } }, deck: { select: { id: true, name: true } } },
            }),
            this.prisma.flashcard.count({ where }),
        ]);
        return paginate(
            items.map(({ states, ...c }) => ({ ...this.serialize(c as Flashcard, states[0]), topic: (c as any).topic, deck: (c as any).deck })),
            total,
            q.page,
            q.limit,
        );
    }

    async create(userId: string, projectId: string, dto: CreateFlashcardDto) {
        await this.access.assert(userId, projectId, 'CONTRIBUTE');
        const deckId = dto.deck_id ?? (await this.defaultDeck(projectId, userId)).id;
        try {
            const card = await this.prisma.flashcard.create({
                data: {
                    project_id: projectId,
                    deck_id: deckId,
                    topic_id: dto.topic_id,
                    front: dto.front.trim(),
                    back: dto.back.trim(),
                    tags: dto.tags ?? [],
                    category: dto.category,
                    difficulty: dto.difficulty ?? 2,
                    origin: ContentOrigin.MANUAL,
                    content_hash: cardHash(dto.front),
                    created_by: userId,
                    updated_by: userId,
                },
            });
            return this.serialize(card);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('A card with the same front already exists');
            throw error;
        }
    }

    async update(userId: string, cardId: string, dto: UpdateFlashcardDto) {
        const card = await this.access.assertResource(userId, await this.prisma.flashcard.findUnique({ where: { id: cardId } }), 'EDIT', 'Flashcard not found');
        const updated = await this.prisma.flashcard.update({
            where: { id: cardId },
            data: {
                ...dto,
                front: dto.front?.trim(),
                back: dto.back?.trim(),
                content_hash: dto.front ? cardHash(dto.front) : undefined,
                version: { increment: 1 },
                updated_by: userId,
                // Preserve the first AI-generated version before the first edit.
                original: card.origin === ContentOrigin.AI && !card.original ? ({ front: card.front, back: card.back } as Prisma.InputJsonValue) : undefined,
            },
        });
        return this.serialize(updated);
    }

    async remove(userId: string, cardId: string) {
        await this.access.assertResource(userId, await this.prisma.flashcard.findUnique({ where: { id: cardId } }), 'EDIT', 'Flashcard not found');
        await this.prisma.flashcard.delete({ where: { id: cardId } });
        return { success: true };
    }

    // ── AI generation (background) ──

    async generate(userId: string, projectId: string, dto: GenerateFlashcardsDto) {
        await this.access.assert(userId, projectId, 'CONTRIBUTE');
        if (dto.deck_id) {
            const deck = await this.prisma.flashcardDeck.findFirst({ where: { id: dto.deck_id, project_id: projectId } });
            if (!deck) throw new NotFoundException('Deck not found');
        }
        const job = await this.jobs.enqueue(JobTypes.GENERATE_FLASHCARDS, { userId, projectId, ...dto }, { userId, projectId, priority: 6, maxAttempts: 2 });
        return { job_id: job.id };
    }

    private async runGeneration(p: GenerateFlashcardsDto & { userId: string; projectId: string }, jobId: string) {
        const notify = (status: string, extra: Record<string, unknown> = {}) =>
            this.realtime.toUser(p.userId, RealtimeEvents.GENERATION_STATUS, { kind: 'flashcards', id: jobId, project_id: p.projectId, status, ...extra });
        notify('GENERATING');
        try {
            const count = p.count ?? 15;
            let passages: Passage[] = [];
            if (p.selection_text?.trim()) {
                const ctx = await this.knowledge.retrieve([p.projectId], p.selection_text.slice(0, 1000), { k: 1, documentIds: p.selection_document_id ? [p.selection_document_id] : undefined });
                if (!ctx[0]) throw new PermanentJobError('The selection could not be matched to your material');
                passages = [{ ...ctx[0], content: p.selection_text.trim() }];
            } else if (p.note_ids?.length) {
                const notes = await this.prisma.note.findMany({ where: { id: { in: p.note_ids }, project_id: p.projectId, OR: [{ user_id: p.userId }, { is_shared: true }] } });
                const anchor = (await this.knowledge.retrieve([p.projectId], notes.map((n) => n.content).join(' ').slice(0, 800), { k: 1 }))[0];
                passages = notes.map((n) => ({
                    chunkId: n.chunk_id ?? anchor?.chunkId ?? '',
                    documentId: n.document_id ?? anchor?.documentId ?? '',
                    documentTitle: n.title ?? 'My notes',
                    pageStart: n.page,
                    pageEnd: n.page,
                    section: null,
                    topicId: n.topic_id,
                    content: [n.selection_text, n.content].filter(Boolean).join('\n\n'),
                }));
            } else {
                passages = await this.knowledge.samplePassages(p.projectId, { count: Math.min(24, Math.ceil(count / 2) + 2), documentIds: p.document_ids, topicIds: p.topic_ids, preferUnused: 'flashcards' });
            }
            if (!passages.length) throw new PermanentJobError('No processed study material available yet');
            const deckId = p.deck_id ?? (await this.defaultDeck(p.projectId, p.userId)).id;
            const model = this.ai.providerInfo.fast_model;
            let created = 0;
            for (let i = 0; i < passages.length && created < count; i += 6) {
                const batch = passages.slice(i, i + 6);
                const want = Math.min(15, count - created);
                const cards = await this.ai.generateFlashcards({ userId: p.userId, projectId: p.projectId, task: 'flashcard_generation' }, batch, want, p.instructions);
                const rows = cards
                    .filter((c) => c.front?.trim() && c.back?.trim())
                    .slice(0, want)
                    .map((c) => {
                        const src = batch[Math.max(0, Math.min(batch.length - 1, (c.source_index ?? 1) - 1))];
                        return {
                            project_id: p.projectId,
                            deck_id: deckId,
                            topic_id: src.topicId,
                            chunk_id: src.chunkId || null,
                            front: c.front.trim().slice(0, 2000),
                            back: c.back.trim().slice(0, 4000),
                            tags: (c.tags ?? []).slice(0, 6).map((t) => t.toLowerCase()),
                            category: c.category,
                            difficulty: Math.min(5, Math.max(1, c.difficulty || 2)),
                            origin: ContentOrigin.AI,
                            source_ref: src.chunkId ? (toSourceRef(src) as unknown as Prisma.InputJsonValue) : undefined,
                            generation_model: model,
                            content_hash: cardHash(c.front),
                            created_by: p.userId,
                        };
                    });
                const res = await this.prisma.flashcard.createMany({ data: rows, skipDuplicates: true });
                created += res.count;
                if (p.selection_text || p.note_ids?.length) break;
            }
            notify('READY', { created });
            return { created };
        } catch (error) {
            notify('FAILED', { error: error?.message ?? 'Generation failed' });
            throw error instanceof PermanentJobError ? error : new PermanentJobError(error?.response?.message ?? error?.message ?? 'Generation failed');
        }
    }

    // ── Spaced repetition ──

    /**
     * Personalized review queue, prioritised: (1) frequently forgotten, (2) recently incorrect, (3) due,
     * (4) new material (capped), (5) strongly remembered cards are not shown until due.
     */
    async reviewQueue(userId: string, projectId: string | null, q: ReviewQueryType) {
        const projectIds = projectId ? [projectId] : await this.access.projectIdsForUser(userId);
        if (projectId) await this.access.assert(userId, projectId, 'STUDY');
        const now = new Date();
        const deckFilter = q.deck_id ? { card: { deck_id: q.deck_id } } : {};
        const due = await this.prisma.cardState.findMany({
            where: { user_id: userId, project_id: { in: projectIds }, due_at: { lte: now }, ...deckFilter },
            include: { card: true },
            take: 500,
        });
        const priority = (s: CardState) => {
            let score = 0;
            score += Math.min(s.lapses, 5) * 20; // frequently forgotten
            if (s.last_rating === 'AGAIN' || s.status === CardStatus.NEEDS_REVIEW) score += 50; // recently incorrect
            score += Math.min(30, (now.getTime() - s.due_at.getTime()) / 86_400_000); // overdue
            return score;
        };
        due.sort((a, b) => priority(b) - priority(a));
        const remaining = Math.max(0, q.limit - due.length);
        const newCards = remaining
            ? await this.prisma.flashcard.findMany({
                where: { project_id: { in: projectIds }, states: { none: { user_id: userId } }, ...(q.deck_id ? { deck_id: q.deck_id } : {}) },
                orderBy: [{ difficulty: 'asc' }, { created_at: 'asc' }],
                take: Math.min(remaining, q.new_limit),
            })
            : [];
        const queue = [
            ...due.slice(0, q.limit).map(({ card, ...state }) => ({ ...this.serialize(card, state as CardState), intervals: previewIntervals(state) })),
            ...newCards.map((c) => ({ ...this.serialize(c), intervals: previewIntervals(DEFAULT_STATE) })),
        ];
        return { cards: queue, counts: await this.counts(userId, projectIds) };
    }

    async counts(userId: string, projectIds: string[]) {
        const now = new Date();
        const [byStatus, due, totalCards] = await Promise.all([
            this.prisma.cardState.groupBy({ by: ['status'], where: { user_id: userId, project_id: { in: projectIds } }, _count: { _all: true } }),
            this.prisma.cardState.count({ where: { user_id: userId, project_id: { in: projectIds }, due_at: { lte: now } } }),
            this.prisma.flashcard.count({ where: { project_id: { in: projectIds } } }),
        ]);
        const get = (s: CardStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
        const seen = byStatus.reduce((s, b) => s + b._count._all, 0);
        return { due, new: Math.max(0, totalCards - seen), learning: get(CardStatus.LEARNING), needs_review: get(CardStatus.NEEDS_REVIEW), known: get(CardStatus.KNOWN), total: totalCards };
    }

    async review(userId: string, cardId: string, dto: ReviewCardDto) {
        const card = await this.access.assertResource(userId, await this.prisma.flashcard.findUnique({ where: { id: cardId } }), 'STUDY', 'Flashcard not found');
        const current = await this.prisma.cardState.findUnique({ where: { user_id_card_id: { user_id: userId, card_id: cardId } } });
        const prev = current ?? { ...DEFAULT_STATE };
        const next = schedule(prev as any, dto.rating);
        const state = await this.prisma.cardState.upsert({
            where: { user_id_card_id: { user_id: userId, card_id: cardId } },
            create: {
                user_id: userId,
                card_id: cardId,
                project_id: card.project_id,
                status: next.status,
                ease: next.ease,
                interval_days: next.interval_days,
                repetitions: next.repetitions,
                lapses: next.lapses,
                learning_step: next.learning_step,
                due_at: next.due_at,
                last_reviewed_at: new Date(),
                last_rating: dto.rating,
            },
            update: {
                status: next.status,
                ease: next.ease,
                interval_days: next.interval_days,
                repetitions: next.repetitions,
                lapses: next.lapses,
                learning_step: next.learning_step,
                due_at: next.due_at,
                last_reviewed_at: new Date(),
                last_rating: dto.rating,
            },
        });
        await this.prisma.reviewLog.create({
            data: { user_id: userId, card_id: cardId, project_id: card.project_id, rating: dto.rating, prev_interval: prev.interval_days, new_interval: next.interval_days, time_spent_ms: dto.time_spent_ms ?? 0 },
        });
        this.events.emit<CardReviewedEvent>(DomainEvents.CARD_REVIEWED, { userId, projectId: card.project_id, cardId, rating: dto.rating });
        if (dto.time_spent_ms) {
            const secs = Math.min(120, Math.round(dto.time_spent_ms / 1000));
            this.events.emit(DomainEvents.STUDY_TIME_LOGGED, { userId, projectId: card.project_id, seconds: secs });
            await recordStudySession(this.prisma, userId, card.project_id, 'FLASHCARDS', secs).catch(() => undefined);
        }
        return { card_id: cardId, state: { status: state.status, due_at: state.due_at, interval_days: state.interval_days, ease: state.ease, lapses: state.lapses } };
    }

    async stats(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const since = new Date(Date.now() - 30 * 86_400_000);
        const [counts, logs, upcoming] = await Promise.all([
            this.counts(userId, [projectId]),
            this.prisma.reviewLog.findMany({ where: { user_id: userId, project_id: projectId, reviewed_at: { gte: since } }, select: { rating: true, prev_interval: true, reviewed_at: true } }),
            this.prisma.cardState.findMany({ where: { user_id: userId, project_id: projectId, due_at: { gt: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } }, select: { due_at: true } }),
        ]);
        const matured = logs.filter((l) => l.prev_interval >= 1);
        const retention = matured.length ? Math.round((matured.filter((l) => l.rating !== 'AGAIN').length / matured.length) * 100) : null;
        const forecast = Array.from({ length: 7 }, (_, i) => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const from = new Date(start.getTime() + i * 86_400_000);
            const to = new Date(from.getTime() + 86_400_000);
            return { date: from.toISOString().slice(0, 10), count: upcoming.filter((u) => u.due_at >= from && u.due_at < to).length + (i === 0 ? counts.due : 0) };
        });
        return { counts, retention, reviews_30d: logs.length, forecast };
    }
}
