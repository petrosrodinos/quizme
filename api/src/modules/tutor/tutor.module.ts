import { Body, Controller, Delete, Get, Global, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ChatMode, ChatRole, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { DomainEvents } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { recordStudySession } from '@/shared/utils/study-session.utils';
import { AiService } from '../ai/ai.service';
import { toSourceRef } from '../ai/ai.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { GamificationService } from '../gamification/gamification.service';

export class CreateThreadDto {
    @ApiProperty({ enum: ChatMode, required: false }) @IsOptional() @IsEnum(ChatMode) mode?: ChatMode;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) title?: string;
}

export class UpdateThreadDto extends CreateThreadDto { }

export class SendMessageDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(6000) content: string;
    @ApiProperty({ required: false, description: 'Restrict retrieval to a document' }) @IsOptional() @IsUUID() document_id?: string;
    @ApiProperty({ required: false, description: 'Restrict retrieval to a topic' }) @IsOptional() @IsUUID() topic_id?: string;
}

/** Project-aware AI tutor (RAG with citations) with an optional Socratic mode. */
@Injectable()
export class TutorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
        private readonly events: DomainEventsService,
        private readonly gamification: GamificationService,
    ) { }

    async threads(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'STUDY');
        return this.prisma.chatThread.findMany({
            where: { project_id: projectId, user_id: userId },
            orderBy: { updated_at: 'desc' },
            include: { _count: { select: { messages: true } } },
        });
    }

    async createThread(userId: string, projectId: string, dto: CreateThreadDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        return this.prisma.chatThread.create({ data: { project_id: projectId, user_id: userId, mode: dto.mode ?? ChatMode.TUTOR, title: dto.title?.trim() || 'New conversation' } });
    }

    private async ownThread(userId: string, id: string) {
        const thread = await this.prisma.chatThread.findUnique({ where: { id } });
        if (!thread || thread.user_id !== userId) throw new NotFoundException('Conversation not found');
        await this.access.assert(userId, thread.project_id, 'STUDY');
        return thread;
    }

    async updateThread(userId: string, id: string, dto: UpdateThreadDto) {
        await this.ownThread(userId, id);
        return this.prisma.chatThread.update({ where: { id }, data: { mode: dto.mode, title: dto.title?.trim() || undefined } });
    }

    async removeThread(userId: string, id: string) {
        await this.ownThread(userId, id);
        await this.prisma.chatThread.delete({ where: { id } });
        return { success: true };
    }

    async messages(userId: string, id: string) {
        const thread = await this.ownThread(userId, id);
        const messages = await this.prisma.chatMessage.findMany({ where: { thread_id: id }, orderBy: { created_at: 'asc' }, take: 500 });
        return { thread, messages };
    }

    async send(userId: string, id: string, dto: SendMessageDto) {
        const thread = await this.ownThread(userId, id);
        const history = await this.prisma.chatMessage.findMany({ where: { thread_id: id }, orderBy: { created_at: 'desc' }, take: 12 });
        const ordered = history.reverse();
        const lastUser = [...ordered].reverse().find((m) => m.role === ChatRole.USER)?.content ?? '';
        const query = dto.content.length < 60 && lastUser ? `${lastUser}\n${dto.content}` : dto.content;
        const passages = await this.knowledge.retrieve([thread.project_id], query, {
            k: 6,
            userId,
            documentIds: dto.document_id ? [dto.document_id] : undefined,
            topicIds: dto.topic_id ? [dto.topic_id] : undefined,
        });
        const userMsg = await this.prisma.chatMessage.create({ data: { thread_id: id, role: ChatRole.USER, content: dto.content } });
        const reply = await this.ai.tutorReply(
            { userId, projectId: thread.project_id, task: thread.mode === ChatMode.SOCRATIC ? 'socratic' : 'tutor' },
            thread.mode,
            passages,
            ordered.filter((m) => m.role !== ChatRole.SYSTEM).map((m) => ({ role: m.role === ChatRole.USER ? 'user' : 'assistant', content: m.content })),
            dto.content,
        );
        const citations = reply.citedIndices
            .filter((n) => n >= 1 && n <= passages.length)
            .map((n) => ({ index: n, ...toSourceRef(passages[n - 1], passages[n - 1].content.slice(0, 280)) }));
        const assistant = await this.prisma.chatMessage.create({
            data: { thread_id: id, role: ChatRole.ASSISTANT, content: reply.answer, citations: citations as unknown as Prisma.InputJsonValue, grounded: reply.grounded, model: reply.model },
        });
        const isFirst = ordered.length === 0;
        await this.prisma.chatThread.update({ where: { id }, data: { title: isFirst && thread.title === 'New conversation' ? dto.content.slice(0, 60) : undefined, updated_at: new Date() } });
        const userTurns = ordered.filter((m) => m.role === ChatRole.USER).length + 1;
        if (thread.mode === ChatMode.SOCRATIC && userTurns === 3) await this.gamification.bump(userId, 'socratic_sessions');
        this.events.emit(DomainEvents.STUDY_TIME_LOGGED, { userId, projectId: thread.project_id, seconds: 60 });
        await recordStudySession(this.prisma, userId, thread.project_id, 'TUTOR', 60).catch(() => undefined);
        return { user_message: userMsg, assistant_message: assistant };
    }
}

@ApiTags('AI Tutor')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class TutorController {
    constructor(private readonly tutor: TutorService) { }

    @Get('projects/:projectId/tutor/threads')
    threads(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.tutor.threads(userId, projectId);
    }

    @Post('projects/:projectId/tutor/threads')
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateThreadDto) {
        return this.tutor.createThread(userId, projectId, dto);
    }

    @Patch('tutor/threads/:id')
    update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateThreadDto) {
        return this.tutor.updateThread(userId, id, dto);
    }

    @Delete('tutor/threads/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.tutor.removeThread(userId, id);
    }

    @Get('tutor/threads/:id/messages')
    messages(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.tutor.messages(userId, id);
    }

    @Post('tutor/threads/:id/messages')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiOperation({ summary: 'Ask the tutor; answers are grounded in project sources with citations' })
    send(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto) {
        return this.tutor.send(userId, id, dto);
    }
}

@Global()
@Module({ controllers: [TutorController], providers: [TutorService], exports: [TutorService] })
export class TutorModule { }
