import { BadRequestException, Controller, Get, Global, Injectable, Module, Param, ParseUUIDPipe, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { AuditActions, AuditService } from '@/shared/audit/audit.service';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';

const ExportQuerySchema = z.object({
    type: z.enum(['flashcards', 'questions', 'notes', 'study_guides', 'attempts']),
    format: z.enum(['csv', 'json', 'md', 'txt', 'html']).default('csv'),
    deck_id: z.string().uuid().optional(),
});
type ExportQuery = z.infer<typeof ExportQuerySchema>;

type Row = Record<string, string | number | boolean | null>;

const csvCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Prevent CSV/formula injection when opened in spreadsheets.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const toCsv = (rows: Row[]) => {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    return [headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))].join('\n');
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const describeAnswer = (type: string, data: any): string => {
    switch (type) {
        case 'MCQ':
        case 'MULTI_SELECT':
            return (data.correct ?? []).map((i: number) => data.options?.[i]).join(' | ');
        case 'TRUE_FALSE':
            return data.correct ? 'True' : 'False';
        case 'FILL_BLANK':
            return (data.answers ?? []).join(' | ');
        case 'MATCHING':
            return (data.pairs ?? []).map((p: any) => `${p.left} → ${p.right}`).join(' | ');
        case 'ORDERING':
            return (data.items ?? []).join(' → ');
        default:
            return data.expected_answer ?? '';
    }
};

@Injectable()
export class ExportsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly audit: AuditService,
    ) { }

    async build(userId: string, projectId: string, q: ExportQuery): Promise<{ filename: string; mime: string; body: string }> {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        if (!access.canCopy && access.role === 'VIEWER' && q.type !== 'attempts' && q.type !== 'notes') {
            throw new BadRequestException('The project owner does not allow exporting its content');
        }
        const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true } });
        const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'project';
        let title = '';
        let rows: Row[] = [];
        let markdown = '';
        switch (q.type) {
            case 'flashcards': {
                const cards = await this.prisma.flashcard.findMany({
                    where: { project_id: projectId, ...(q.deck_id ? { deck_id: q.deck_id } : {}) },
                    include: { deck: { select: { name: true } }, topic: { select: { name: true } } },
                    orderBy: { created_at: 'asc' },
                });
                title = `Flashcards — ${project.title}`;
                rows = cards.map((c) => ({ front: c.front, back: c.back, deck: c.deck?.name ?? '', topic: c.topic?.name ?? '', tags: c.tags.join(' '), difficulty: c.difficulty }));
                markdown = cards.map((c) => `### ${c.front}\n\n${c.back}\n`).join('\n');
                break;
            }
            case 'questions': {
                const qs = await this.prisma.question.findMany({ where: { project_id: projectId, archived_at: null }, include: { topic: { select: { name: true } } }, orderBy: { created_at: 'asc' } });
                title = `Question bank — ${project.title}`;
                rows = qs.map((x) => ({
                    type: x.type,
                    prompt: x.prompt,
                    options: Array.isArray((x.data as any).options) ? (x.data as any).options.join(' | ') : '',
                    answer: describeAnswer(x.type, x.data),
                    explanation: x.explanation ?? '',
                    difficulty: x.difficulty,
                    topic: x.topic?.name ?? '',
                    concept: x.concept ?? '',
                    source: (x.source_ref as any)?.document_title ? `${(x.source_ref as any).document_title}${(x.source_ref as any).page ? ` p.${(x.source_ref as any).page}` : ''}` : '',
                }));
                markdown = qs
                    .map((x, i) => {
                        const opts = Array.isArray((x.data as any).options) ? `\n${(x.data as any).options.map((o: string, j: number) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n')}` : '';
                        return `${i + 1}. **${x.prompt}**${opts}\n\n   *Answer:* ${describeAnswer(x.type, x.data)}${x.explanation ? `\n\n   *Why:* ${x.explanation}` : ''}\n`;
                    })
                    .join('\n');
                break;
            }
            case 'notes': {
                const notes = await this.prisma.note.findMany({
                    where: { project_id: projectId, OR: [{ user_id: userId }, { is_shared: true }] },
                    include: { document: { select: { filename: true } } },
                    orderBy: { created_at: 'asc' },
                });
                title = `Notes — ${project.title}`;
                rows = notes.map((n) => ({ type: n.type, title: n.title ?? '', content: n.content, quote: n.selection_text ?? '', document: n.document?.filename ?? '', page: n.page, tags: n.tags.join(' '), created_at: n.created_at.toISOString() }));
                markdown = notes
                    .map((n) => `## ${n.title || n.type.toLowerCase()}${n.document ? ` · ${n.document.filename}${n.page ? ` p.${n.page}` : ''}` : ''}\n\n${n.selection_text ? `> ${n.selection_text}\n\n` : ''}${n.content}\n`)
                    .join('\n');
                break;
            }
            case 'study_guides': {
                const summaries = await this.prisma.summary.findMany({ where: { project_id: projectId, status: 'READY' }, include: { document: { select: { filename: true } } }, orderBy: { created_at: 'desc' } });
                title = `Study guides — ${project.title}`;
                rows = summaries.map((s) => ({ level: s.level, document: s.document?.filename ?? 'Whole project', content: s.content, created_at: s.created_at.toISOString() }));
                markdown = summaries.map((s) => `# ${s.level.replace('_', ' ').toLowerCase()} — ${s.document?.filename ?? 'whole project'}\n\n${s.content}\n`).join('\n\n');
                break;
            }
            case 'attempts': {
                const attempts = await this.prisma.quizAttempt.findMany({
                    where: { project_id: projectId, user_id: userId, status: 'COMPLETED' },
                    include: { quiz: { select: { title: true, mode: true } } },
                    orderBy: { completed_at: 'asc' },
                });
                title = `Quiz results — ${project.title}`;
                rows = attempts.map((a) => ({
                    quiz: a.quiz.title,
                    mode: a.quiz.mode,
                    attempt: a.attempt_number,
                    completed_at: a.completed_at?.toISOString() ?? '',
                    score: Math.round(a.score * 10) / 10,
                    max_score: a.max_score,
                    percentage: a.percentage,
                    correct: a.correct_count,
                    incorrect: a.incorrect_count,
                    time_spent_sec: a.time_spent_sec,
                }));
                markdown = `| Quiz | Attempt | Date | Score |\n|---|---|---|---|\n${attempts.map((a) => `| ${a.quiz.title} | ${a.attempt_number} | ${a.completed_at?.toISOString().slice(0, 10)} | ${a.percentage}% |`).join('\n')}`;
                break;
            }
        }
        this.audit.log({ userId, action: AuditActions.DATA_EXPORTED, resourceType: 'project', resourceId: projectId, metadata: { type: q.type, format: q.format } });
        const base = `${slug}-${q.type}`;
        switch (q.format) {
            case 'json':
                return { filename: `${base}.json`, mime: 'application/json', body: JSON.stringify({ title, exported_at: new Date().toISOString(), items: rows }, null, 2) };
            case 'md':
                return { filename: `${base}.md`, mime: 'text/markdown; charset=utf-8', body: `# ${title}\n\n${markdown}` };
            case 'txt':
                return { filename: `${base}.txt`, mime: 'text/plain; charset=utf-8', body: `${title}\n\n${markdown.replace(/[#*>|]/g, '').replace(/\n{3,}/g, '\n\n')}` };
            case 'html':
                return {
                    filename: `${base}.html`,
                    mime: 'text/html; charset=utf-8',
                    body: `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#141413;line-height:1.6}pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:0}}</style></head><body><h1>${esc(title)}</h1><pre>${esc(markdown)}</pre><script>window.onload=()=>window.print()</script></body></html>`,
                };
            default:
                return { filename: `${base}.csv`, mime: 'text/csv; charset=utf-8', body: `﻿${toCsv(rows)}` };
        }
    }
}

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class ExportsController {
    constructor(private readonly exports: ExportsService) { }

    @Get('projects/:projectId/export')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiOperation({ summary: 'Export flashcards, question bank, notes, study guides or quiz results (CSV/JSON/MD/TXT/print-ready HTML for PDF)' })
    async export(
        @CurrentUser('id') userId: string,
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Query(new ZodValidationPipe(ExportQuerySchema)) q: ExportQuery,
        @Req() _req: Request,
        @Res() res: Response,
    ) {
        const file = await this.exports.build(userId, projectId, q);
        res.setHeader('Content-Type', file.mime);
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.send(file.body);
    }
}

@Global()
@Module({ controllers: [ExportsController], providers: [ExportsService] })
export class ExportsModule { }
