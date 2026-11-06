import { Body, Controller, Delete, Get, Global, Module, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { CreateNoteDto, NoteQuerySchema, type NoteQueryType, NotesService, TransformNotesDto, UpdateNoteDto } from './notes.service';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class NotesController {
    constructor(private readonly notes: NotesService) { }

    @Get('projects/:projectId/notes')
    list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(NoteQuerySchema)) q: NoteQueryType) {
        return this.notes.list(userId, projectId, q);
    }

    @Post('projects/:projectId/notes')
    @ApiOperation({ summary: 'Create a note, highlight, annotation, bookmark or question' })
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateNoteDto) {
        return this.notes.create(userId, projectId, dto);
    }

    @Post('projects/:projectId/notes/transform')
    @ApiOperation({ summary: 'Turn notes into flashcards, a quiz, a summary or a study guide' })
    transform(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: TransformNotesDto) {
        return this.notes.transform(userId, projectId, dto);
    }

    @Get('notes/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.notes.get(userId, id);
    }

    @Patch('notes/:id')
    update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNoteDto) {
        return this.notes.update(userId, id, dto);
    }

    @Delete('notes/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.notes.remove(userId, id);
    }
}

@Global()
@Module({ controllers: [NotesController], providers: [NotesService], exports: [NotesService] })
export class NotesModule { }
