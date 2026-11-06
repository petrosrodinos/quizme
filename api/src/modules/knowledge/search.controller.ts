import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { KnowledgeService } from './knowledge.service';

const SearchQuerySchema = z.object({
    q: z.string().trim().min(1).max(300),
    project_id: z.string().uuid().optional(),
    semantic: z
        .enum(['true', 'false'])
        .optional()
        .default('true')
        .transform((v) => v === 'true'),
});
type SearchQuery = z.infer<typeof SearchQuerySchema>;

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('search')
export class SearchController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly knowledge: KnowledgeService,
    ) { }

    @Get()
    @Throttle({ default: { limit: 40, ttl: 60_000 } })
    @ApiOperation({ summary: 'Global search across projects, documents, notes, flashcards, questions, topics + semantic passage search' })
    async search(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQuery) {
        let projectIds = await this.access.projectIdsForUser(userId);
        if (query.project_id) {
            await this.access.assert(userId, query.project_id, 'VIEW');
            projectIds = [query.project_id];
        }
        const q = query.q;
        const ci = { contains: q, mode: 'insensitive' as const };
        const inProjects = { project_id: { in: projectIds } };
        const [projects, documents, notes, flashcards, questions, topics, passages] = await Promise.all([
            this.prisma.project.findMany({
                where: { id: { in: projectIds }, OR: [{ title: ci }, { description: ci }, { subject: ci }] },
                select: { id: true, title: true, subject: true },
                take: 8,
            }),
            this.prisma.studyDocument.findMany({ where: { ...inProjects, filename: ci }, select: { id: true, project_id: true, filename: true, status: true }, take: 8 }),
            this.prisma.note.findMany({
                where: { ...inProjects, OR: [{ user_id: userId }, { is_shared: true }], AND: [{ OR: [{ title: ci }, { content: ci }, { selection_text: ci }] }] },
                select: { id: true, project_id: true, title: true, content: true, type: true },
                take: 8,
            }),
            this.prisma.flashcard.findMany({ where: { ...inProjects, OR: [{ front: ci }, { back: ci }] }, select: { id: true, project_id: true, front: true, back: true }, take: 8 }),
            this.prisma.question.findMany({
                where: { ...inProjects, archived_at: null, OR: [{ prompt: ci }, { concept: ci }] },
                select: { id: true, project_id: true, prompt: true, type: true, concept: true },
                take: 8,
            }),
            this.prisma.topic.findMany({ where: { ...inProjects, name: ci }, select: { id: true, project_id: true, name: true }, take: 8 }),
            query.semantic && projectIds.length
                ? this.knowledge.retrieve(projectIds.slice(0, 20), q, { k: 8, userId })
                : Promise.resolve([]),
        ]);
        return {
            projects,
            documents,
            notes: notes.map((n) => ({ ...n, content: n.content.slice(0, 200) })),
            flashcards,
            questions,
            topics,
            passages: passages.map((p) => ({
                chunk_id: p.chunkId,
                project_id: p.projectId,
                document_id: p.documentId,
                document_title: p.documentTitle,
                page: p.pageStart,
                section: p.section,
                snippet: p.content.slice(0, 400),
                score: p.score,
            })),
        };
    }
}
