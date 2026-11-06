import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameStatus, GenerationStatus, Prisma, QuestionType } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { DomainEvents } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { QuestionsService } from '../questions/questions.service';
import { gradeObjective } from '../questions/questions.utils';

export interface TimerState {
    status: 'idle' | 'running' | 'paused';
    mode: 'focus' | 'break';
    duration_sec: number;
    remaining_sec: number;
    ends_at: string | null;
    updated_by: string | null;
}

const userSelect = { id: true, full_name: true, email: true, avatar_url: true } as const;
const displayName = (u: { full_name: string | null; email: string }) => u.full_name || u.email.split('@')[0];
const REVEAL_SECONDS = 5;

/**
 * Collaborative study: study rooms (presence, chat with an in-room AI tutor, shared Pomodoro timer, shared notes)
 * and real-time multiplayer quizzes. Game timers are held in-process; for multi-instance deployments add the
 * Socket.IO Redis adapter and move timers to the job queue (see docs/ARCHITECTURE.md).
 */
@Injectable()
export class RoomsService {
    private readonly logger = new Logger(RoomsService.name);
    private readonly gameTimers = new Map<string, NodeJS.Timeout>();
    private readonly revealing = new Set<string>(); // `${gameId}:${index}` already revealed
    private readonly presence = new Map<string, Map<string, number>>(); // roomId → userId → socket count

    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly realtime: RealtimeService,
        private readonly events: DomainEventsService,
        private readonly questions: QuestionsService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
    ) { }

    // ── Rooms (REST) ──

    async list(userId: string, projectId?: string) {
        const projectIds = projectId ? [projectId] : await this.access.projectIdsForUser(userId);
        if (projectId) await this.access.assert(userId, projectId, 'VIEW');
        const rooms = await this.prisma.studyRoom.findMany({
            where: { project_id: { in: projectIds }, closed_at: null },
            orderBy: { updated_at: 'desc' },
            include: { project: { select: { id: true, title: true } } },
            take: 100,
        });
        return rooms.map((r) => ({ ...r, online: this.presence.get(r.id)?.size ?? 0 }));
    }

    async create(userId: string, projectId: string, name: string) {
        await this.access.assert(userId, projectId, 'STUDY');
        return this.prisma.studyRoom.create({
            data: { project_id: projectId, name: name.trim().slice(0, 80) || 'Study room', created_by: userId, timer_state: this.defaultTimer() as unknown as Prisma.InputJsonValue },
        });
    }

    private defaultTimer(): TimerState {
        return { status: 'idle', mode: 'focus', duration_sec: 25 * 60, remaining_sec: 25 * 60, ends_at: null, updated_by: null };
    }

    async loadRoom(userId: string, roomId: string) {
        const room = await this.prisma.studyRoom.findUnique({ where: { id: roomId }, include: { project: { select: { id: true, title: true } } } });
        if (!room || room.closed_at) throw new NotFoundException('Room not found');
        const access = await this.access.assert(userId, room.project_id, 'STUDY');
        return { room, access };
    }

    async get(userId: string, roomId: string) {
        const { room } = await this.loadRoom(userId, roomId);
        const [messages, game] = await Promise.all([
            this.prisma.studyRoomMessage.findMany({ where: { room_id: roomId }, orderBy: { created_at: 'desc' }, take: 100, include: { user: { select: userSelect } } }),
            this.prisma.multiplayerGame.findFirst({ where: { room_id: roomId, status: { not: GameStatus.FINISHED } }, orderBy: { created_at: 'desc' }, select: { id: true, status: true } }),
        ]);
        return { ...room, timer_state: this.timer(room.timer_state), messages: messages.reverse(), active_game: game, online: await this.presenceList(roomId) };
    }

    async close(userId: string, roomId: string) {
        const { room, access } = await this.loadRoom(userId, roomId);
        if (room.created_by !== userId && !this.access.hasCapability(access.role, 'MANAGE_MEMBERS')) throw new ForbiddenException('Only the creator can close this room');
        await this.prisma.studyRoom.update({ where: { id: roomId }, data: { closed_at: new Date() } });
        this.realtime.toRoom(`room:${roomId}`, RealtimeEvents.ROOM_STATE, { id: roomId, closed: true });
        return { success: true };
    }

    // ── Realtime room actions ──

    async join(userId: string, roomId: string) {
        const { room } = await this.loadRoom(userId, roomId);
        const users = this.presence.get(roomId) ?? new Map<string, number>();
        users.set(userId, (users.get(userId) ?? 0) + 1);
        this.presence.set(roomId, users);
        await this.broadcastPresence(roomId);
        this.events.emit(DomainEvents.ROOM_JOINED, { userId, projectId: room.project_id, resourceId: roomId });
        return this.get(userId, roomId);
    }

    async leave(userId: string, roomId: string) {
        const users = this.presence.get(roomId);
        if (!users) return;
        const n = (users.get(userId) ?? 1) - 1;
        if (n <= 0) users.delete(userId);
        else users.set(userId, n);
        await this.broadcastPresence(roomId);
    }

    private async presenceList(roomId: string) {
        const ids = [...(this.presence.get(roomId)?.keys() ?? [])];
        if (!ids.length) return [];
        const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
        return users.map((u) => ({ id: u.id, name: displayName(u), avatar_url: u.avatar_url }));
    }

    private async broadcastPresence(roomId: string) {
        this.realtime.toRoom(`room:${roomId}`, RealtimeEvents.ROOM_PRESENCE, { room_id: roomId, users: await this.presenceList(roomId) });
    }

    async message(userId: string, roomId: string, content: string) {
        const { room } = await this.loadRoom(userId, roomId);
        const text = content.trim().slice(0, 2000);
        if (!text) throw new BadRequestException('Empty message');
        const msg = await this.prisma.studyRoomMessage.create({ data: { room_id: roomId, user_id: userId, content: text }, include: { user: { select: userSelect } } });
        this.realtime.toRoom(`room:${roomId}`, RealtimeEvents.ROOM_MESSAGE, msg);
        await this.prisma.studyRoom.update({ where: { id: roomId }, data: { updated_at: new Date() } });
        const ask = /^(@tutor|\/ai|\/tutor)\s+/i.exec(text);
        if (ask) {
            setImmediate(async () => {
                try {
                    const question = text.slice(ask[0].length);
                    const passages = await this.knowledge.retrieve([room.project_id], question, { k: 5, userId });
                    const reply = await this.ai.tutorReply({ userId, projectId: room.project_id, task: 'room_tutor' }, 'TUTOR', passages, [], question);
                    const sources = reply.citedIndices
                        .filter((n) => n >= 1 && n <= passages.length)
                        .map((n) => `[${n}] ${passages[n - 1].documentTitle}${passages[n - 1].pageStart ? ` p.${passages[n - 1].pageStart}` : ''}`);
                    const aiMsg = await this.prisma.studyRoomMessage.create({
                        data: { room_id: roomId, user_id: userId, is_ai: true, content: `${reply.answer}${sources.length ? `\n\n*Sources: ${sources.join('; ')}*` : ''}` },
                        include: { user: { select: userSelect } },
                    });
                    this.realtime.toRoom(`room:${roomId}`, RealtimeEvents.ROOM_MESSAGE, aiMsg);
                } catch (error) {
                    this.logger.warn(`Room tutor failed: ${error?.message}`);
                }
            });
        }
        return msg;
    }

    private timer(raw: Prisma.JsonValue | null): TimerState {
        const t = (raw as unknown as TimerState) ?? this.defaultTimer();
        if (t.status === 'running' && t.ends_at) {
            const remaining = Math.max(0, Math.round((new Date(t.ends_at).getTime() - Date.now()) / 1000));
            return remaining === 0 ? { ...t, status: 'idle', remaining_sec: t.duration_sec, ends_at: null } : { ...t, remaining_sec: remaining };
        }
        return t;
    }

    async timerAction(userId: string, roomId: string, action: 'start' | 'pause' | 'reset', durationMin?: number, mode?: 'focus' | 'break') {
        const { room } = await this.loadRoom(userId, roomId);
        const current = this.timer(room.timer_state);
        let next: TimerState;
        if (action === 'start') {
            const duration = durationMin ? Math.min(180, Math.max(1, durationMin)) * 60 : current.status === 'paused' ? current.duration_sec : current.duration_sec;
            const remaining = current.status === 'paused' && !durationMin ? current.remaining_sec : duration;
            next = { status: 'running', mode: mode ?? current.mode, duration_sec: duration, remaining_sec: remaining, ends_at: new Date(Date.now() + remaining * 1000).toISOString(), updated_by: userId };
        } else if (action === 'pause') {
            next = { ...current, status: 'paused', ends_at: null, updated_by: userId };
        } else {
            const duration = durationMin ? Math.min(180, Math.max(1, durationMin)) * 60 : mode === 'break' ? 5 * 60 : 25 * 60;
            next = { status: 'idle', mode: mode ?? 'focus', duration_sec: duration, remaining_sec: duration, ends_at: null, updated_by: userId };
        }
        await this.prisma.studyRoom.update({ where: { id: roomId }, data: { timer_state: next as unknown as Prisma.InputJsonValue } });
        this.realtime.toRoom(`room:${roomId}`, RealtimeEvents.ROOM_STATE, { id: roomId, timer_state: next });
        return next;
    }

    async updateNotes(userId: string, roomId: string, content: string) {
        await this.loadRoom(userId, roomId);
        const text = content.slice(0, 50_000);
        await this.prisma.studyRoom.update({ where: { id: roomId }, data: { shared_notes: text } });
        this.realtime.toRoom(`room:${roomId}`, RealtimeEvents.ROOM_STATE, { id: roomId, shared_notes: text, notes_updated_by: userId });
        return { saved: true };
    }

    // ── Multiplayer quiz ──

    async createGame(userId: string, projectId: string, dto: { quiz_id: string; room_id?: string; seconds_per_question?: number }) {
        await this.access.assert(userId, projectId, 'STUDY');
        const quiz = await this.prisma.quiz.findFirst({ where: { id: dto.quiz_id, project_id: projectId }, include: { _count: { select: { questions: true } } } });
        if (!quiz) throw new NotFoundException('Quiz not found');
        if (quiz.status !== GenerationStatus.READY || !quiz._count.questions) throw new BadRequestException('Quiz is not ready yet');
        if (dto.room_id) {
            const room = await this.prisma.studyRoom.findFirst({ where: { id: dto.room_id, project_id: projectId, closed_at: null } });
            if (!room) throw new NotFoundException('Room not found');
        }
        const game = await this.prisma.multiplayerGame.create({
            data: {
                project_id: projectId,
                quiz_id: quiz.id,
                room_id: dto.room_id ?? null,
                host_id: userId,
                seconds_per_question: Math.min(120, Math.max(10, dto.seconds_per_question ?? 20)),
                players: { create: { user_id: userId } },
            },
        });
        if (dto.room_id) this.realtime.toRoom(`room:${dto.room_id}`, RealtimeEvents.ROOM_STATE, { id: dto.room_id, active_game: { id: game.id, status: game.status } });
        return this.gameState(game.id, userId);
    }

    async assertGameAccess(userId: string, gameId: string) {
        await this.loadGame(userId, gameId);
    }

    private async loadGame(userId: string, gameId: string) {
        const game = await this.prisma.multiplayerGame.findUnique({ where: { id: gameId } });
        if (!game) throw new NotFoundException('Game not found');
        await this.access.assert(userId, game.project_id, 'STUDY');
        return game;
    }

    private async questionsFor(quizId: string) {
        const links = await this.prisma.quizQuestion.findMany({ where: { quiz_id: quizId }, orderBy: { order_index: 'asc' }, include: { question: true } });
        return links.map((l) => l.question);
    }

    async gameState(gameId: string, viewerId?: string) {
        const game = await this.prisma.multiplayerGame.findUniqueOrThrow({
            where: { id: gameId },
            include: { quiz: { select: { id: true, title: true } }, players: { include: { user: { select: userSelect } } } },
        });
        const questions = await this.questionsFor(game.quiz_id);
        const current = game.current_index >= 0 && game.current_index < questions.length ? questions[game.current_index] : null;
        const answers = current ? await this.prisma.gameAnswer.findMany({ where: { game_id: gameId, question_id: current.id } }) : [];
        const deadline = game.question_started_at ? new Date(game.question_started_at.getTime() + game.seconds_per_question * 1000) : null;
        const revealing = !!current && (answers.length >= game.players.length || (deadline !== null && deadline < new Date()));
        const players = game.players
            .map((p) => ({ user_id: p.user_id, name: displayName(p.user), avatar_url: p.user.avatar_url, score: p.score, correct: p.correct, answered_current: answers.some((a) => a.user_id === p.user_id) }))
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({ ...p, rank: i + 1 }));
        return {
            id: game.id,
            project_id: game.project_id,
            room_id: game.room_id,
            host_id: game.host_id,
            status: game.status,
            quiz: game.quiz,
            seconds_per_question: game.seconds_per_question,
            current_index: game.current_index,
            total: questions.length,
            question: current && game.status === GameStatus.IN_PROGRESS ? this.questions.toClient(current) : null,
            deadline_at: deadline,
            server_time: new Date(),
            players,
            my_answer: viewerId ? answers.find((a) => a.user_id === viewerId) ?? null : null,
            reveal:
                revealing && current
                    ? {
                        question_id: current.id,
                        correct_answer: gradeObjective(current.type, current.data, {})?.correctAnswer ?? { text: (current.data as any)?.expected_answer },
                        explanation: current.explanation,
                        results: answers.map((a) => ({ user_id: a.user_id, is_correct: a.is_correct, points: a.points, time_ms: a.time_ms })),
                    }
                    : null,
        };
    }

    private async broadcastGame(gameId: string) {
        const state = await this.gameState(gameId);
        this.realtime.toRoom(`game:${gameId}`, RealtimeEvents.GAME_STATE, state);
        return state;
    }

    async joinGame(userId: string, gameId: string) {
        const game = await this.loadGame(userId, gameId);
        if (game.status === GameStatus.LOBBY) {
            await this.prisma.gamePlayer.upsert({ where: { game_id_user_id: { game_id: gameId, user_id: userId } }, create: { game_id: gameId, user_id: userId }, update: {} });
        }
        await this.broadcastGame(gameId);
        return this.gameState(gameId, userId);
    }

    async startGame(userId: string, gameId: string) {
        const game = await this.loadGame(userId, gameId);
        if (game.host_id !== userId) throw new ForbiddenException('Only the host can start the game');
        if (game.status !== GameStatus.LOBBY) throw new BadRequestException('Game already started');
        await this.prisma.multiplayerGame.update({ where: { id: gameId }, data: { status: GameStatus.IN_PROGRESS, current_index: 0, question_started_at: new Date() } });
        this.scheduleReveal(gameId, 0, game.seconds_per_question);
        return this.broadcastGame(gameId);
    }

    private setTimer(gameId: string, timer: NodeJS.Timeout | null) {
        const existing = this.gameTimers.get(gameId);
        if (existing) clearTimeout(existing);
        if (timer) this.gameTimers.set(gameId, timer);
        else this.gameTimers.delete(gameId);
    }

    private scheduleReveal(gameId: string, index: number, seconds: number) {
        this.setTimer(
            gameId,
            setTimeout(() => void this.revealAndAdvance(gameId, index).catch((e) => this.logger.warn(`Game advance failed: ${e?.message}`)), seconds * 1000 + 300),
        );
    }

    /** Broadcast the reveal, then move to the next question (or finish) after a short pause. */
    private async revealAndAdvance(gameId: string, expectedIndex?: number) {
        const game = await this.prisma.multiplayerGame.findUnique({ where: { id: gameId } });
        if (!game || game.status !== GameStatus.IN_PROGRESS) return;
        // Ignore stale timers/requests for a question that is no longer current or already revealed.
        if (expectedIndex !== undefined && game.current_index !== expectedIndex) return;
        if (this.revealing.has(`${gameId}:${game.current_index}`)) return;
        const index = game.current_index;
        this.revealing.add(`${gameId}:${index}`);
        await this.prisma.multiplayerGame.update({ where: { id: gameId }, data: { question_started_at: new Date(Date.now() - game.seconds_per_question * 1000 - 1000) } });
        await this.broadcastGame(gameId);
        this.setTimer(
            gameId,
            setTimeout(async () => {
                try {
                    const fresh = await this.prisma.multiplayerGame.findUnique({ where: { id: gameId } });
                    if (!fresh || fresh.status !== GameStatus.IN_PROGRESS || fresh.current_index !== index) return;
                    const total = await this.prisma.quizQuestion.count({ where: { quiz_id: fresh.quiz_id } });
                    if (index + 1 >= total) await this.finish(gameId);
                    else {
                        await this.prisma.multiplayerGame.update({ where: { id: gameId }, data: { current_index: index + 1, question_started_at: new Date() } });
                        this.scheduleReveal(gameId, index + 1, fresh.seconds_per_question);
                        await this.broadcastGame(gameId);
                    }
                } catch (e) {
                    this.logger.warn(`Game step failed: ${e?.message}`);
                }
            }, REVEAL_SECONDS * 1000),
        );
    }

    private async finish(gameId: string) {
        const game = await this.prisma.multiplayerGame.update({ where: { id: gameId }, data: { status: GameStatus.FINISHED, finished_at: new Date() }, include: { players: true } });
        this.setTimer(gameId, null);
        for (const key of [...this.revealing]) if (key.startsWith(`${gameId}:`)) this.revealing.delete(key);
        const ranked = [...game.players].sort((a, b) => b.score - a.score);
        if (ranked.length >= 2 && ranked[0].score > (ranked[1]?.score ?? 0)) this.events.emit(DomainEvents.GAME_WON, { userId: ranked[0].user_id, projectId: game.project_id, resourceId: gameId });
        await this.broadcastGame(gameId);
    }

    async answer(userId: string, gameId: string, questionId: string, answer: any) {
        const game = await this.loadGame(userId, gameId);
        if (game.status !== GameStatus.IN_PROGRESS || !game.question_started_at) throw new BadRequestException('No active question');
        const questions = await this.questionsFor(game.quiz_id);
        const current = questions[game.current_index];
        if (!current || current.id !== questionId) throw new BadRequestException('This question is no longer active');
        const elapsed = Date.now() - game.question_started_at.getTime();
        if (elapsed > game.seconds_per_question * 1000 + 1500) throw new BadRequestException("Time's up");
        const player = await this.prisma.gamePlayer.findUnique({ where: { game_id_user_id: { game_id: gameId, user_id: userId } } });
        if (!player) throw new ForbiddenException('Join the game first');
        const grade =
            current.type === QuestionType.FREE_TEXT
                ? await this.questions.grade(userId, current, answer, game.project_id)
                : { ...gradeObjective(current.type, current.data, answer)! };
        const speed = Math.max(0, 1 - elapsed / (game.seconds_per_question * 1000));
        const points = grade.isCorrect ? Math.round(500 + 500 * speed) : Math.round(300 * (grade.score ?? 0));
        try {
            await this.prisma.$transaction([
                this.prisma.gameAnswer.create({ data: { game_id: gameId, user_id: userId, question_id: questionId, answer: answer as Prisma.InputJsonValue, is_correct: grade.isCorrect, points, time_ms: elapsed } }),
                this.prisma.gamePlayer.update({ where: { game_id_user_id: { game_id: gameId, user_id: userId } }, data: { score: { increment: points }, correct: { increment: grade.isCorrect ? 1 : 0 } } }),
            ]);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Already answered');
            throw error;
        }
        const [answered, players] = await Promise.all([
            this.prisma.gameAnswer.count({ where: { game_id: gameId, question_id: questionId } }),
            this.prisma.gamePlayer.count({ where: { game_id: gameId } }),
        ]);
        if (answered >= players) await this.revealAndAdvance(gameId, game.current_index);
        else await this.broadcastGame(gameId);
        return { is_correct: grade.isCorrect, points };
    }

    async skipToNext(userId: string, gameId: string) {
        const game = await this.loadGame(userId, gameId);
        if (game.host_id !== userId) throw new ForbiddenException('Only the host can advance');
        await this.revealAndAdvance(gameId, game.current_index);
        return { ok: true };
    }
}
