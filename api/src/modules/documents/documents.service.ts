import { BadRequestException, Injectable, Logger, OnModuleInit, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus, Prisma, StudyDocument } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { FileTokenService } from '@/core/storage/file-token.service';
import { JobContext, JobsService, JobTypes, PermanentJobError } from '@/core/jobs/jobs.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { AuditActions, AuditService } from '@/shared/audit/audit.service';
import { DomainEvents } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { sha256 } from '@/shared/utils/hash.utils';
import { extractKeywords, wordCount } from '@/integrations/ai/local/nlp.utils';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { chunkBlocks } from './utils/chunking.utils';
import { detectFileType, extractDocument, validateSignature } from './utils/extraction.utils';

export const MAX_FILES_PER_UPLOAD = 10;

@Injectable()
export class DocumentsService implements OnModuleInit {
    private readonly logger = new Logger(DocumentsService.name);
    private readonly maxBytes: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly files: FileTokenService,
        private readonly jobs: JobsService,
        private readonly realtime: RealtimeService,
        private readonly access: ProjectAccessService,
        private readonly audit: AuditService,
        private readonly events: DomainEventsService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
        config: ConfigService,
    ) {
        this.maxBytes = Number(config.get('MAX_UPLOAD_MB') ?? 50) * 1024 * 1024;
    }

    onModuleInit() {
        this.jobs.register(JobTypes.PROCESS_DOCUMENT, (payload, ctx) => this.process(payload.documentId, ctx));
    }

    serialize(doc: StudyDocument) {
        const { storage_key: _k, checksum_sha256: _c, ...rest } = doc;
        return rest;
    }

    async upload(userId: string, projectId: string, uploads: Express.Multer.File[]) {
        await this.access.assert(userId, projectId, 'CONTRIBUTE');
        if (!uploads?.length) throw new BadRequestException('No files uploaded');
        if (uploads.length > MAX_FILES_PER_UPLOAD) throw new BadRequestException(`Upload at most ${MAX_FILES_PER_UPLOAD} files at once`);

        const results: Array<{ filename: string; status: 'queued' | 'duplicate' | 'rejected'; reason?: string; document?: ReturnType<DocumentsService['serialize']> }> = [];
        for (const file of uploads) {
            const filename = Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 200);
            const type = detectFileType(filename);
            if (!type) {
                results.push({ filename, status: 'rejected', reason: 'Unsupported file type. Use PDF, DOCX, TXT or Markdown.' });
                continue;
            }
            if (file.size > this.maxBytes) {
                results.push({ filename, status: 'rejected', reason: `File exceeds the ${Math.round(this.maxBytes / 1048576)} MB limit` });
                continue;
            }
            if (!file.size || !validateSignature(type, file.buffer)) {
                results.push({ filename, status: 'rejected', reason: 'File content does not match its type or is empty' });
                continue;
            }
            const checksum = sha256(file.buffer);
            const existing = await this.prisma.studyDocument.findUnique({ where: { project_id_checksum_sha256: { project_id: projectId, checksum_sha256: checksum } } });
            if (existing) {
                results.push({ filename, status: 'duplicate', reason: `Already uploaded as "${existing.filename}"`, document: this.serialize(existing) });
                continue;
            }
            const key = this.storage.buildKey(`projects/${projectId}/documents`, filename);
            await this.storage.put(key, file.buffer, file.mimetype || 'application/octet-stream');
            const doc = await this.prisma.studyDocument.create({
                data: {
                    project_id: projectId,
                    uploaded_by: userId,
                    filename,
                    mime_type: file.mimetype || 'application/octet-stream',
                    file_type: type,
                    size_bytes: file.size,
                    storage_key: key,
                    checksum_sha256: checksum,
                },
            });
            await this.jobs.enqueue(JobTypes.PROCESS_DOCUMENT, { documentId: doc.id }, { userId, projectId, resourceId: doc.id, dedupeKey: `doc:${doc.id}`, priority: 5 });
            results.push({ filename, status: 'queued', document: this.serialize(doc) });
        }
        if (results.every((r) => r.status === 'rejected') && results.length === 1) {
            throw new BadRequestException(results[0].reason);
        }
        return { results };
    }

    async list(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const docs = await this.prisma.studyDocument.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
        return docs.map((d) => this.serialize(d));
    }

    async get(userId: string, documentId: string) {
        const doc = await this.access.assertResource(userId, await this.prisma.studyDocument.findUnique({ where: { id: documentId } }), 'VIEW', 'Document not found');
        return { ...this.serialize(doc), view_url: this.files.signedUrl(doc.storage_key, doc.mime_type, doc.filename, 'inline') };
    }

    async downloadUrl(userId: string, documentId: string) {
        const doc = await this.access.assertResource(userId, await this.prisma.studyDocument.findUnique({ where: { id: documentId } }), 'VIEW', 'Document not found');
        return { url: this.files.signedUrl(doc.storage_key, doc.mime_type, doc.filename, 'attachment', 300) };
    }

    /** Processed content for the in-app reader (chunks in order with section/page metadata). */
    async content(userId: string, documentId: string, page = 1, limit = 40) {
        const doc = await this.access.assertResource(userId, await this.prisma.studyDocument.findUnique({ where: { id: documentId } }), 'VIEW', 'Document not found');
        const take = Math.min(Math.max(limit, 1), 100);
        const [chunks, total] = await Promise.all([
            this.prisma.documentChunk.findMany({
                where: { document_id: documentId },
                orderBy: { chunk_index: 'asc' },
                skip: (Math.max(page, 1) - 1) * take,
                take,
                select: { id: true, chunk_index: true, content: true, section_path: true, page_start: true, page_end: true, topic_id: true, keywords: true },
            }),
            this.prisma.documentChunk.count({ where: { document_id: documentId } }),
        ]);
        return {
            document: this.serialize(doc),
            data: chunks,
            pagination: { total, page, limit: take, total_pages: Math.max(1, Math.ceil(total / take)), has_next: page * take < total, has_prev: page > 1 },
        };
    }

    async remove(userId: string, documentId: string, ip?: string) {
        const doc = await this.access.assertResource(userId, await this.prisma.studyDocument.findUnique({ where: { id: documentId } }), 'EDIT', 'Document not found');
        await this.prisma.studyDocument.delete({ where: { id: documentId } });
        this.knowledge.invalidate(doc.project_id);
        void this.storage.delete(doc.storage_key);
        this.audit.log({ userId, action: AuditActions.DOCUMENT_DELETED, resourceType: 'document', resourceId: documentId, ip, metadata: { filename: doc.filename } });
        return { success: true };
    }

    async reprocess(userId: string, documentId: string) {
        const doc = await this.access.assertResource(userId, await this.prisma.studyDocument.findUnique({ where: { id: documentId } }), 'CONTRIBUTE', 'Document not found');
        const updated = await this.prisma.studyDocument.update({ where: { id: doc.id }, data: { status: DocumentStatus.UPLOADED, progress: 0, error_message: null } });
        await this.jobs.enqueue(JobTypes.PROCESS_DOCUMENT, { documentId: doc.id }, { userId, projectId: doc.project_id, resourceId: doc.id, dedupeKey: `doc:${doc.id}`, priority: 5 });
        this.broadcast(updated);
        return this.serialize(updated);
    }

    // ── Processing pipeline (background job) ───────────────────

    private async setStatus(id: string, status: DocumentStatus, progress: number, extra: Prisma.StudyDocumentUpdateInput = {}) {
        const doc = await this.prisma.studyDocument.update({ where: { id }, data: { status, progress, ...extra } });
        this.broadcast(doc);
        return doc;
    }

    private broadcast(doc: StudyDocument) {
        void this.prisma.projectMember
            .findMany({ where: { project_id: doc.project_id }, select: { user_id: true } })
            .then((members) =>
                members.forEach((m) =>
                    this.realtime.toUser(m.user_id, RealtimeEvents.DOCUMENT_STATUS, {
                        id: doc.id,
                        project_id: doc.project_id,
                        status: doc.status,
                        progress: doc.progress,
                        error_message: doc.error_message,
                        chunk_count: doc.chunk_count,
                    }),
                ),
            )
            .catch(() => undefined);
    }

    /** Upload → Processing → Extracting → Chunking → Indexing → Ready (or Failed with a reason). */
    private async process(documentId: string, ctx: JobContext) {
        const doc = await this.prisma.studyDocument.findUnique({ where: { id: documentId } });
        if (!doc) return { skipped: 'deleted' };
        try {
            await this.setStatus(doc.id, DocumentStatus.PROCESSING, 5, { error_message: null });
            const buffer = await this.storage.get(doc.storage_key);

            await this.setStatus(doc.id, DocumentStatus.EXTRACTING, 15);
            let extracted;
            try {
                extracted = await extractDocument(doc.file_type, buffer);
            } catch (error) {
                throw new PermanentJobError(`Could not read this file (${error?.message ?? 'parse error'}). It may be corrupted or password-protected.`);
            }
            const fullText = extracted.blocks.map((b) => b.text).join(' ');
            const words = wordCount(fullText);
            if (words < 20) {
                throw new PermanentJobError(
                    doc.file_type === 'PDF'
                        ? 'No extractable text found. Scanned/image-only PDFs are not supported yet — please upload a text-based PDF.'
                        : 'The document contains too little text to study from.',
                );
            }

            await this.setStatus(doc.id, DocumentStatus.CHUNKING, 35, { page_count: extracted.pageCount, word_count: words });
            const { chunks, outline } = chunkBlocks(extracted.blocks);

            await this.setStatus(doc.id, DocumentStatus.INDEXING, 45, { outline: outline as unknown as Prisma.InputJsonValue });
            const model = this.ai.embeddingModel;
            const hashes = chunks.map((c) => sha256(c.content));
            // Reuse embeddings for identical content already indexed in this project (cost control on re-uploads/reprocessing).
            const reusable = await this.prisma.documentChunk.findMany({
                where: { project_id: doc.project_id, content_hash: { in: hashes }, embedding_model: model },
                select: { content_hash: true, embedding: true },
                distinct: ['content_hash'],
            });
            const reuseMap = new Map(reusable.map((r) => [r.content_hash, r.embedding]));
            const vectors: number[][] = new Array(chunks.length);
            const toEmbed: number[] = [];
            chunks.forEach((_, i) => (reuseMap.has(hashes[i]) ? (vectors[i] = reuseMap.get(hashes[i])!) : toEmbed.push(i)));
            const BATCH = 96;
            let embeddingModel = model;
            for (let i = 0; i < toEmbed.length; i += BATCH) {
                const idx = toEmbed.slice(i, i + BATCH);
                const res = await this.ai.embed(
                    idx.map((j) => chunks[j].content),
                    { userId: doc.uploaded_by, projectId: doc.project_id, task: 'embeddings' },
                );
                embeddingModel = res.model;
                idx.forEach((j, n) => (vectors[j] = res.vectors[n]));
                const pct = 45 + Math.round((45 * Math.min(i + BATCH, toEmbed.length)) / Math.max(1, toEmbed.length));
                await this.setStatus(doc.id, DocumentStatus.INDEXING, pct);
                await ctx.progress(pct, 'indexing');
            }

            await this.prisma.$transaction(async (tx) => {
                await tx.documentChunk.deleteMany({ where: { document_id: doc.id } });
                for (let i = 0; i < chunks.length; i += 400) {
                    await tx.documentChunk.createMany({
                        data: chunks.slice(i, i + 400).map((c, n) => ({
                            document_id: doc.id,
                            project_id: doc.project_id,
                            chunk_index: c.index,
                            content: c.content,
                            section_path: c.sectionPath,
                            page_start: c.pageStart,
                            page_end: c.pageEnd,
                            token_count: c.tokens,
                            keywords: extractKeywords(c.content, 8),
                            content_hash: hashes[i + n],
                            embedding: vectors[i + n] ?? [],
                            embedding_model: embeddingModel,
                        })),
                    });
                }
            }, { timeout: 120_000 });
            this.knowledge.invalidate(doc.project_id);

            const ready = await this.setStatus(doc.id, DocumentStatus.READY, 100, {
                chunk_count: chunks.length,
                embedding_model: embeddingModel,
                processed_at: new Date(),
                error_message: null,
            });
            await this.jobs.enqueue(JobTypes.BUILD_TOPICS, { projectId: doc.project_id }, { projectId: doc.project_id, dedupeKey: `topics:${doc.project_id}`, runAt: new Date(Date.now() + 3000) });
            this.events.emit(DomainEvents.DOCUMENT_READY, { userId: doc.uploaded_by, projectId: doc.project_id, resourceId: doc.id });
            return { chunks: chunks.length, words, pages: ready.page_count, reused_embeddings: chunks.length - toEmbed.length };
        } catch (error) {
            const final = error instanceof PermanentJobError || ctx.job.attempts >= ctx.job.max_attempts;
            const message = error instanceof PermanentJobError ? error.message : `Processing failed: ${String(error?.message ?? error).slice(0, 300)}`;
            await this.setStatus(doc.id, final ? DocumentStatus.FAILED : DocumentStatus.PROCESSING, final ? 0 : 5, {
                error_message: final ? message : `${message} — retrying automatically`,
            }).catch(() => undefined);
            if (final) this.events.emit(DomainEvents.DOCUMENT_FAILED, { userId: doc.uploaded_by, projectId: doc.project_id, resourceId: doc.id });
            throw error;
        }
    }

    assertSize(file: Express.Multer.File) {
        if (file.size > this.maxBytes) throw new PayloadTooLargeException('File too large');
    }
}
