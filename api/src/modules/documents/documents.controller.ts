import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { DocumentsService, MAX_FILES_PER_UPLOAD } from './documents.service';

const ContentQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(40),
});
type ContentQuery = z.infer<typeof ContentQuerySchema>;

const HARD_LIMIT_BYTES = Number(process.env.MAX_UPLOAD_MB || 50) * 1024 * 1024;

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class DocumentsController {
    constructor(private readonly documents: DocumentsService) { }

    @Post('projects/:projectId/documents')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload one or more study documents (PDF, DOCX, TXT, MD); processing runs in the background' })
    @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_UPLOAD, { limits: { fileSize: HARD_LIMIT_BYTES, files: MAX_FILES_PER_UPLOAD } }))
    upload(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @UploadedFiles() files: Express.Multer.File[]) {
        return this.documents.upload(userId, projectId, files);
    }

    @Get('projects/:projectId/documents')
    list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.documents.list(userId, projectId);
    }

    @Get('documents/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.documents.get(userId, id);
    }

    @Get('documents/:id/content')
    @ApiOperation({ summary: 'Processed text (chunks with section/page metadata) for the reader' })
    content(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Query(new ZodValidationPipe(ContentQuerySchema)) q: ContentQuery) {
        return this.documents.content(userId, id, q.page, q.limit);
    }

    @Get('documents/:id/download')
    @ApiOperation({ summary: 'Short-lived signed download URL for the original file' })
    download(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.documents.downloadUrl(userId, id);
    }

    @Post('documents/:id/reprocess')
    @HttpCode(200)
    reprocess(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.documents.reprocess(userId, id);
    }

    @Delete('documents/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        return this.documents.remove(userId, id, req.ip);
    }
}
