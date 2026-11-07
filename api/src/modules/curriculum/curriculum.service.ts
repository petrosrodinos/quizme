import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';

export type LessonItemType = 'document' | 'quiz' | 'deck' | 'note' | 'summary' | 'question';

const ITEM_TYPES: LessonItemType[] = ['document', 'quiz', 'deck', 'note', 'summary', 'question'];

@Injectable()
export class CurriculumService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
    ) { }

    /** Prisma delegate per content type (all share project_id + lesson_id). */
    private delegate(type: LessonItemType): any {
        const p = this.prisma as any;
        switch (type) {
            case 'document': return p.studyDocument;
            case 'quiz': return p.quiz;
            case 'deck': return p.flashcardDeck;
            case 'note': return p.note;
            case 'summary': return p.summary;
            case 'question': return p.question;
        }
    }

    async tree(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const units = await this.prisma.unit.findMany({
            where: { project_id: projectId },
            orderBy: { order_index: 'asc' },
            include: {
                lessons: {
                    orderBy: { order_index: 'asc' },
                    include: {
                        _count: { select: { documents: true, quizzes: true, decks: true, notes: true, summaries: true, questions: true } },
                    },
                },
            },
        });
        const unsortedEntries = await Promise.all(
            ITEM_TYPES.map(async (t) => [t, await this.delegate(t).count({ where: { project_id: projectId, lesson_id: null } })] as const),
        );
        return {
            units: units.map((u) => ({
                id: u.id,
                title: u.title,
                description: u.description,
                order_index: u.order_index,
                lessons: u.lessons.map((l) => ({
                    id: l.id,
                    unit_id: l.unit_id,
                    title: l.title,
                    description: l.description,
                    order_index: l.order_index,
                    counts: {
                        documents: l._count.documents,
                        quizzes: l._count.quizzes,
                        decks: l._count.decks,
                        notes: l._count.notes,
                        summaries: l._count.summaries,
                        questions: l._count.questions,
                    },
                })),
            })),
            unsorted: Object.fromEntries(unsortedEntries) as Record<LessonItemType, number>,
        };
    }

    // ---- Units ----

    async createUnit(userId: string, projectId: string, dto: { title: string; description?: string }) {
        await this.access.assert(userId, projectId, 'EDIT');
        const last = await this.prisma.unit.aggregate({ where: { project_id: projectId }, _max: { order_index: true } });
        return this.prisma.unit.create({
            data: { project_id: projectId, title: dto.title.trim(), description: dto.description, order_index: (last._max.order_index ?? -1) + 1 },
        });
    }

    async updateUnit(userId: string, id: string, dto: { title?: string; description?: string }) {
        const unit = await this.access.assertResource(userId, await this.prisma.unit.findUnique({ where: { id } }), 'EDIT', 'Unit not found');
        return this.prisma.unit.update({
            where: { id: unit.id },
            data: { title: dto.title?.trim(), description: dto.description },
        });
    }

    /** Deleting a unit removes its lessons; their content falls back to Unsorted (FK SET NULL). */
    async removeUnit(userId: string, id: string) {
        const unit = await this.access.assertResource(userId, await this.prisma.unit.findUnique({ where: { id } }), 'EDIT', 'Unit not found');
        await this.prisma.unit.delete({ where: { id: unit.id } });
        return { success: true };
    }

    // ---- Lessons ----

    async createLesson(userId: string, unitId: string, dto: { title: string; description?: string }) {
        const unit = await this.access.assertResource(userId, await this.prisma.unit.findUnique({ where: { id: unitId } }), 'EDIT', 'Unit not found');
        const last = await this.prisma.lesson.aggregate({ where: { unit_id: unit.id }, _max: { order_index: true } });
        return this.prisma.lesson.create({
            data: {
                project_id: unit.project_id,
                unit_id: unit.id,
                title: dto.title.trim(),
                description: dto.description,
                order_index: (last._max.order_index ?? -1) + 1,
            },
        });
    }

    async getLesson(userId: string, id: string) {
        const lesson = await this.access.assertResource(userId, await this.prisma.lesson.findUnique({ where: { id } }), 'VIEW', 'Lesson not found');
        const [documents, quizzes, decks, notes, summaries] = await Promise.all([
            this.prisma.studyDocument.findMany({
                where: { lesson_id: id }, orderBy: { created_at: 'asc' },
                select: { id: true, filename: true, file_type: true, status: true, created_at: true },
            }),
            this.prisma.quiz.findMany({
                where: { lesson_id: id }, orderBy: { created_at: 'asc' },
                select: { id: true, title: true, mode: true, status: true, created_at: true },
            }),
            this.prisma.flashcardDeck.findMany({
                where: { lesson_id: id }, orderBy: { created_at: 'asc' },
                select: { id: true, name: true, description: true, created_at: true },
            }),
            this.prisma.note.findMany({
                where: { lesson_id: id, user_id: userId }, orderBy: { created_at: 'asc' },
                select: { id: true, type: true, created_at: true },
            }),
            this.prisma.summary.findMany({
                where: { lesson_id: id }, orderBy: { created_at: 'asc' },
                select: { id: true, level: true, status: true, document_id: true, created_at: true },
            }),
        ]);
        return { ...lesson, documents, quizzes, decks, notes, summaries };
    }

    async updateLesson(userId: string, id: string, dto: { title?: string; description?: string }) {
        const lesson = await this.access.assertResource(userId, await this.prisma.lesson.findUnique({ where: { id } }), 'EDIT', 'Lesson not found');
        return this.prisma.lesson.update({
            where: { id: lesson.id },
            data: { title: dto.title?.trim(), description: dto.description },
        });
    }

    async removeLesson(userId: string, id: string) {
        const lesson = await this.access.assertResource(userId, await this.prisma.lesson.findUnique({ where: { id } }), 'EDIT', 'Lesson not found');
        await this.prisma.lesson.delete({ where: { id: lesson.id } });
        return { success: true };
    }

    // ---- Reorder ----

    /** Rewrites order of all units and the lessons in each (a lesson listed under another unit is moved). */
    async reorder(userId: string, projectId: string, dto: { units: { id: string; lesson_ids: string[] }[] }) {
        await this.access.assert(userId, projectId, 'EDIT');
        const unitIds = dto.units.map((u) => u.id);
        const lessonIds = dto.units.flatMap((u) => u.lesson_ids);
        if (new Set(unitIds).size !== unitIds.length || new Set(lessonIds).size !== lessonIds.length) {
            throw new BadRequestException('Duplicate ids in order payload');
        }
        const [unitCount, lessonCount] = await Promise.all([
            this.prisma.unit.count({ where: { id: { in: unitIds }, project_id: projectId } }),
            this.prisma.lesson.count({ where: { id: { in: lessonIds }, project_id: projectId } }),
        ]);
        if (unitCount !== unitIds.length || lessonCount !== lessonIds.length) {
            throw new NotFoundException('Unit or lesson not found in this project');
        }
        await this.prisma.$transaction([
            ...dto.units.map((u, i) => this.prisma.unit.update({ where: { id: u.id }, data: { order_index: i } })),
            ...dto.units.flatMap((u) =>
                u.lesson_ids.map((lid, j) => this.prisma.lesson.update({ where: { id: lid }, data: { unit_id: u.id, order_index: j } })),
            ),
        ]);
        return this.tree(userId, projectId);
    }

    // ---- Assignment ----

    async assignItems(userId: string, lessonId: string, type: LessonItemType, ids: string[]) {
        const lesson = await this.access.assertResource(userId, await this.prisma.lesson.findUnique({ where: { id: lessonId } }), 'EDIT', 'Lesson not found');
        return this.setLesson(lesson.project_id, type, ids, lesson.id);
    }

    async unassignItems(userId: string, projectId: string, type: LessonItemType, ids: string[]) {
        await this.access.assert(userId, projectId, 'EDIT');
        return this.setLesson(projectId, type, ids, null);
    }

    private async setLesson(projectId: string, type: LessonItemType, ids: string[], lessonId: string | null) {
        const d = this.delegate(type);
        const found = await d.count({ where: { id: { in: ids }, project_id: projectId } });
        if (found !== new Set(ids).size) throw new NotFoundException('Some items were not found in this project');
        const res = await d.updateMany({ where: { id: { in: ids }, project_id: projectId }, data: { lesson_id: lessonId } });
        return { updated: res.count };
    }
}
