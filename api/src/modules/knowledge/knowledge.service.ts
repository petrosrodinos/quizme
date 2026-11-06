import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { cosine } from '@/integrations/ai/local/nlp.utils';
import { AiService } from '../ai/ai.service';
import { Passage } from '../ai/ai.types';

interface IndexEntry {
    id: string;
    documentId: string;
    topicId: string | null;
    vector: number[];
}

interface ProjectIndex {
    signature: string;
    model: string;
    entries: IndexEntry[];
    builtAt: number;
}

export interface RetrieveOptions {
    k?: number;
    documentIds?: string[];
    topicIds?: string[];
    userId?: string | null;
    minScore?: number;
}

const RRF_K = 60;

/**
 * Knowledge layer / RAG retrieval. Hybrid search = vector similarity (embeddings, in-memory index per project,
 * rebuilt when the project's chunk set changes) + Postgres full-text keyword ranking, fused with Reciprocal Rank
 * Fusion and filtered by project/document/topic metadata. Retrieval is ALWAYS scoped to explicitly authorized
 * project ids — callers must check permissions first — so content never leaks across projects or tenants.
 */
@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);
    private readonly indexes = new Map<string, ProjectIndex>();
    private readonly maxIndexedProjects = 50;

    constructor(
        private readonly prisma: PrismaService,
        private readonly ai: AiService,
    ) { }

    invalidate(projectId: string) {
        this.indexes.delete(projectId);
    }

    private async signature(projectId: string): Promise<string> {
        const agg = await this.prisma.documentChunk.aggregate({
            where: { project_id: projectId },
            _count: { _all: true },
            _max: { created_at: true },
        });
        return `${agg._count._all}:${agg._max.created_at?.getTime() ?? 0}`;
    }

    private async getIndex(projectId: string): Promise<ProjectIndex> {
        const signature = await this.signature(projectId);
        const cached = this.indexes.get(projectId);
        if (cached && cached.signature === signature && cached.model === this.ai.embeddingModel) return cached;
        const rows = await this.prisma.documentChunk.findMany({
            where: { project_id: projectId, embedding_model: this.ai.embeddingModel },
            select: { id: true, document_id: true, topic_id: true, embedding: true },
        });
        const index: ProjectIndex = {
            signature,
            model: this.ai.embeddingModel,
            builtAt: Date.now(),
            entries: rows.filter((r) => r.embedding.length).map((r) => ({ id: r.id, documentId: r.document_id, topicId: r.topic_id, vector: r.embedding })),
        };
        if (this.indexes.size >= this.maxIndexedProjects) {
            const oldest = [...this.indexes.entries()].sort((a, b) => a[1].builtAt - b[1].builtAt)[0];
            if (oldest) this.indexes.delete(oldest[0]);
        }
        this.indexes.set(projectId, index);
        return index;
    }

    async retrieve(projectIds: string[], query: string, opts: RetrieveOptions = {}): Promise<Passage[]> {
        const k = opts.k ?? 6;
        const q = query.trim().slice(0, 2000);
        if (!q || !projectIds.length) return [];

        const [vectorRanked, keywordRanked] = await Promise.all([this.vectorSearch(projectIds, q, opts), this.keywordSearch(projectIds, q, opts)]);
        const fused = new Map<string, number>();
        vectorRanked.forEach((r, i) => fused.set(r.id, (fused.get(r.id) ?? 0) + 1 / (RRF_K + i + 1) + (r.score > 0.5 ? 0.004 : 0)));
        keywordRanked.forEach((id, i) => fused.set(id, (fused.get(id) ?? 0) + 1 / (RRF_K + i + 1)));
        const vecScore = new Map(vectorRanked.map((r) => [r.id, r.score]));
        const ranked = [...fused.entries()]
            .sort((a, b) => b[1] - a[1])
            .filter(([id]) => opts.minScore === undefined || (vecScore.get(id) ?? 0) >= opts.minScore || keywordRanked.includes(id))
            .slice(0, k);
        const passages = await this.passagesByIds(ranked.map(([id]) => id));
        const scoreMap = new Map(ranked);
        return passages.map((p) => ({ ...p, score: Number((scoreMap.get(p.chunkId) ?? 0).toFixed(5)) }));
    }

    private async vectorSearch(projectIds: string[], q: string, opts: RetrieveOptions) {
        try {
            const qvec = await this.ai.embedQuery(q, { userId: opts.userId, projectId: projectIds[0], task: 'retrieval' });
            const results: { id: string; score: number }[] = [];
            for (const projectId of projectIds) {
                const index = await this.getIndex(projectId);
                for (const e of index.entries) {
                    if (opts.documentIds?.length && !opts.documentIds.includes(e.documentId)) continue;
                    if (opts.topicIds?.length && (!e.topicId || !opts.topicIds.includes(e.topicId))) continue;
                    results.push({ id: e.id, score: cosine(qvec, e.vector) });
                }
            }
            return results.sort((a, b) => b.score - a.score).slice(0, 40);
        } catch (error) {
            this.logger.warn(`Vector search failed: ${error?.message}`);
            return [];
        }
    }

    /** Postgres full-text ranking (parameterized raw query: Prisma has no tsvector support). */
    private async keywordSearch(projectIds: string[], q: string, opts: RetrieveOptions): Promise<string[]> {
        try {
            const docFilter = opts.documentIds?.length ? Prisma.sql`AND document_id = ANY(${opts.documentIds}::text[])` : Prisma.empty;
            const topicFilter = opts.topicIds?.length ? Prisma.sql`AND topic_id = ANY(${opts.topicIds}::text[])` : Prisma.empty;
            const rows = await this.prisma.$queryRaw<{ id: string }[]>`
                SELECT id FROM document_chunks
                WHERE project_id = ANY(${projectIds}::text[]) ${docFilter} ${topicFilter}
                  AND to_tsvector('english', content) @@ websearch_to_tsquery('english', ${q})
                ORDER BY ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', ${q})) DESC
                LIMIT 40`;
            if (rows.length) return rows.map((r) => r.id);
            const orQuery = q
                .split(/\s+/)
                .filter((w) => w.length > 3)
                .slice(0, 8)
                .join(' OR ');
            if (!orQuery) return [];
            const loose = await this.prisma.$queryRaw<{ id: string }[]>`
                SELECT id FROM document_chunks
                WHERE project_id = ANY(${projectIds}::text[]) ${docFilter} ${topicFilter}
                  AND to_tsvector('english', content) @@ websearch_to_tsquery('english', ${orQuery})
                ORDER BY ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', ${orQuery})) DESC
                LIMIT 40`;
            return loose.map((r) => r.id);
        } catch (error) {
            this.logger.warn(`Keyword search failed: ${error?.message}`);
            return [];
        }
    }

    async passagesByIds(ids: string[]): Promise<Passage[]> {
        if (!ids.length) return [];
        const rows = await this.prisma.documentChunk.findMany({
            where: { id: { in: ids } },
            include: { document: { select: { filename: true } } },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => ({
                chunkId: r!.id,
                projectId: r!.project_id,
                documentId: r!.document_id,
                documentTitle: r!.document.filename,
                pageStart: r!.page_start,
                pageEnd: r!.page_end,
                section: r!.section_path.length ? r!.section_path.join(' › ') : null,
                topicId: r!.topic_id,
                content: r!.content,
            }));
    }

    /**
     * Picks source passages for generation with broad coverage: stratified across documents/topics and biased toward
     * chunks that have not yet been used to generate questions (avoids repetition). With `concepts`, targets them via retrieval.
     */
    async samplePassages(
        projectId: string,
        opts: { count: number; documentIds?: string[]; topicIds?: string[]; concepts?: string[]; userId?: string | null; preferUnused?: 'questions' | 'flashcards' },
    ): Promise<Passage[]> {
        if (opts.concepts?.length) {
            const perConcept = Math.max(1, Math.ceil(opts.count / opts.concepts.length));
            const seen = new Set<string>();
            const out: Passage[] = [];
            for (const concept of opts.concepts.slice(0, 8)) {
                const found = await this.retrieve([projectId], concept, { k: perConcept + 1, documentIds: opts.documentIds, userId: opts.userId });
                for (const p of found) if (!seen.has(p.chunkId) && out.length < opts.count) {
                    seen.add(p.chunkId);
                    out.push(p);
                }
            }
            if (out.length) return out;
        }
        const where: Prisma.DocumentChunkWhereInput = {
            project_id: projectId,
            ...(opts.documentIds?.length ? { document_id: { in: opts.documentIds } } : {}),
            ...(opts.topicIds?.length ? { topic_id: { in: opts.topicIds } } : {}),
            token_count: { gte: 60 },
        };
        const candidates = await this.prisma.documentChunk.findMany({ where, select: { id: true, document_id: true, topic_id: true }, take: 5000 });
        if (!candidates.length) return [];
        let used = new Set<string>();
        if (opts.preferUnused === 'questions') {
            const rows = await this.prisma.question.findMany({ where: { project_id: projectId, chunk_id: { not: null } }, select: { chunk_id: true } });
            used = new Set(rows.map((r) => r.chunk_id!));
        } else if (opts.preferUnused === 'flashcards') {
            const rows = await this.prisma.flashcard.findMany({ where: { project_id: projectId, chunk_id: { not: null } }, select: { chunk_id: true } });
            used = new Set(rows.map((r) => r.chunk_id!));
        }
        const groups = new Map<string, typeof candidates>();
        for (const c of candidates) {
            const key = c.topic_id ?? c.document_id;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(c);
        }
        for (const list of groups.values()) list.sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)) || Math.random() - 0.5);
        const picked: string[] = [];
        const lists = [...groups.values()].sort(() => Math.random() - 0.5);
        while (picked.length < opts.count && lists.some((l) => l.length)) {
            for (const list of lists) {
                const next = list.shift();
                if (next) picked.push(next.id);
                if (picked.length >= opts.count) break;
            }
        }
        return this.passagesByIds(picked);
    }

    async documentPassages(documentId: string): Promise<Passage[]> {
        const rows = await this.prisma.documentChunk.findMany({ where: { document_id: documentId }, orderBy: { chunk_index: 'asc' }, select: { id: true } });
        return this.passagesByIds(rows.map((r) => r.id));
    }

    async projectPassages(projectId: string, limit = 4000): Promise<Passage[]> {
        const rows = await this.prisma.documentChunk.findMany({
            where: { project_id: projectId },
            orderBy: [{ document_id: 'asc' }, { chunk_index: 'asc' }],
            select: { id: true },
            take: limit,
        });
        return this.passagesByIds(rows.map((r) => r.id));
    }
}
