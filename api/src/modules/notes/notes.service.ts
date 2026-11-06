import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { NoteType, Prisma } from 'generated/prisma';
import { z } from 'zod';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { AiService } from '../ai/ai.service';
import { FlashcardsService } from '../flashcards/flashcards.service';
import { QuizzesService } from '../quizzes/quizzes.service';
import { I18nService } from '@/shared/i18n/i18n.service';


export class CreateNoteDto {
    @ApiProperty({ enum: NoteType, required: false }) @IsOptional() @IsEnum(NoteType) type?: NoteType;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) title?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(50_000) content?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() document_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) page?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() chunk_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(5000) selection_text?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() topic_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() question_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() flashcard_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) color?: string;
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) tags?: string[];
    @ApiProperty({ required: false, description: 'Visible to all project members' }) @IsOptional() @IsBoolean() is_shared?: boolean;
}
export class UpdateNoteDto extends PartialType(CreateNoteDto) { }

export class TransformNotesDto {
    @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsUUID('all', { each: true }) note_ids: string[];
    @ApiProperty({ enum: ['flashcards', 'quiz', 'summary', 'study_guide'] }) @IsIn(['flashcards', 'quiz', 'summary', 'study_guide']) target: 'flashcards' | 'quiz' | 'summary' | 'study_guide';
}

export const NoteQuerySchema = z.object({
    type: z.nativeEnum(NoteType).optional(),
    document_id: z.string().uuid().optional(),
    topic_id: z.string().uuid().optional(),
    search: z.string().trim().max(200).optional(),
    scope: z.enum(['mine', 'shared', 'all']).optional().default('all'),
});
export type NoteQueryType = z.infer<typeof NoteQuerySchema>;

@Injectable()
export class NotesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly ai: AiService,
        private readonly flashcards: FlashcardsService,
        private readonly quizzes: QuizzesService,
        private readonly i18n: I18nService,
    ) { }

    async list(userId: string, projectId: string, q: NoteQueryType) {
        await this.access.assert(userId, projectId, 'VIEW');
        const visibility: Prisma.NoteWhereInput =
            q.scope === 'mine' ? { user_id: userId } : q.scope === 'shared' ? { is_shared: true } : { OR: [{ user_id: userId }, { is_shared: true }] };
        return this.prisma.note.findMany({
            where: {
                project_id: projectId,
                ...visibility,
                ...(q.type ? { type: q.type } : {}),
                ...(q.document_id ? { document_id: q.document_id } : {}),
                ...(q.topic_id ? { topic_id: q.topic_id } : {}),
                ...(q.search ? { AND: [{ OR: [{ title: { contains: q.search, mode: 'insensitive' } }, { content: { contains: q.search, mode: 'insensitive' } }, { selection_text: { contains: q.search, mode: 'insensitive' } }] }] } : {}),
            },
            orderBy: { updated_at: 'desc' },
            take: 500,
            include: { user: { select: { id: true, full_name: true, email: true } }, document: { select: { id: true, filename: true } }, topic: { select: { id: true, name: true } } },
        });
    }

    private async own(userId: string, id: string, forDelete = false) {
        const note = await this.prisma.note.findUnique({ where: { id } });
        if (!note) throw new NotFoundException('Note not found');
        const access = await this.access.assert(userId, note.project_id, 'VIEW');
        if (note.user_id !== userId) {
            if (!note.is_shared) throw new NotFoundException('Note not found');
            if (!(forDelete ? this.access.hasCapability(access.role, 'MANAGE_MEMBERS') : this.access.hasCapability(access.role, 'EDIT'))) {
                throw new ForbiddenException('Only the author can modify this note');
            }
        }
        return note;
    }

    async get(userId: string, id: string) {
        const note = await this.prisma.note.findUnique({ where: { id } });
        if (!note) throw new NotFoundException('Note not found');
        await this.access.assert(userId, note.project_id, 'VIEW');
        if (note.user_id !== userId && !note.is_shared) throw new NotFoundException('Note not found');
        return note;
    }

    async create(userId: string, projectId: string, dto: CreateNoteDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        if (dto.document_id) {
            const doc = await this.prisma.studyDocument.findFirst({ where: { id: dto.document_id, project_id: projectId }, select: { id: true } });
            if (!doc) throw new BadRequestException('Document not in this project');
        }
        if (dto.is_shared) await this.access.assert(userId, projectId, 'CONTRIBUTE');
        return this.prisma.note.create({ data: { ...dto, content: dto.content ?? '', project_id: projectId, user_id: userId, tags: dto.tags ?? [] } });
    }

    async update(userId: string, id: string, dto: UpdateNoteDto) {
        const note = await this.own(userId, id);
        if (dto.is_shared) await this.access.assert(userId, note.project_id, 'CONTRIBUTE');
        return this.prisma.note.update({ where: { id }, data: { ...dto, document_id: undefined } });
    }

    async remove(userId: string, id: string) {
        await this.own(userId, id, true);
        await this.prisma.note.delete({ where: { id } });
        return { success: true };
    }

    /** AI transforms: notes → flashcards / quiz / summary / study guide. */
    async transform(userId: string, projectId: string, dto: TransformNotesDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        const notes = await this.prisma.note.findMany({ where: { id: { in: dto.note_ids }, project_id: projectId, OR: [{ user_id: userId }, { is_shared: true }] } });
        if (!notes.length) throw new BadRequestException('No accessible notes selected');
        const text = notes
            .map((n) => [n.title ? `## ${n.title}` : '', n.selection_text ? `> ${n.selection_text}` : '', n.content].filter(Boolean).join('\n'))
            .join('\n\n')
            .slice(0, 12_000);
        if (text.trim().length < 30) throw new BadRequestException('Selected notes do not contain enough text');
        const { t } = await this.i18n.forUser(userId);
        if (dto.target === 'flashcards') return { kind: 'flashcards', ...(await this.flashcards.generate(userId, projectId, { note_ids: notes.map((n) => n.id), count: Math.min(30, notes.length * 4) })) };
        if (dto.target === 'quiz') {
            const quiz = await this.quizzes.create(userId, projectId, { mode: 'SELECTION', selection_text: text, count: Math.min(15, Math.max(5, notes.length * 2)), title: t('quiz.title.fromNotes') });
            return { kind: 'quiz', quiz_id: quiz.id };
        }
        const level = dto.target === 'summary' ? 'FIVE_MINUTE' : 'STUDY_GUIDE';
        const passage = { chunkId: '', documentId: '', documentTitle: 'My notes', pageStart: null, pageEnd: null, section: null, topicId: null, content: text };
        const res = await this.ai.summarize({ userId, projectId, task: `notes_${dto.target}` }, level, dto.target === 'summary' ? t('notes.summaryTitle') : t('notes.guideTitle'), [passage]);
        const note = await this.prisma.note.create({
            data: {
                project_id: projectId,
                user_id: userId,
                type: NoteType.NOTE,
                title: dto.target === 'summary' ? t('notes.summaryTitle') : t('notes.guideTitle'),
                content: res.content.replace(/\s?\[\d+\]/g, ''),
                tags: ['ai', dto.target],
            },
        });
        return { kind: 'note', note };
    }
}
