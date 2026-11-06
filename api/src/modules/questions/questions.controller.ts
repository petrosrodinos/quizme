import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, QuestionQuerySchema, type QuestionQueryType, UpdateQuestionDto } from './dto/questions.dto';

@ApiTags('Question bank')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class QuestionsController {
    constructor(private readonly questions: QuestionsService) { }

    @Get('projects/:projectId/questions')
    @ApiOperation({ summary: 'Filter/search the question bank' })
    list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(QuestionQuerySchema)) q: QuestionQueryType) {
        return this.questions.list(userId, projectId, q);
    }

    @Post('projects/:projectId/questions')
    @ApiOperation({ summary: 'Add a question manually' })
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateQuestionDto) {
        return this.questions.create(userId, projectId, dto);
    }

    @Get('questions/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.questions.get(userId, id);
    }

    @Patch('questions/:id')
    @ApiOperation({ summary: 'Edit a question (versioned)' })
    update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionDto) {
        return this.questions.update(userId, id, dto);
    }

    @Post('questions/:id/versions/:version/restore')
    restore(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Param('version', ParseIntPipe) version: number) {
        return this.questions.restoreVersion(userId, id, version);
    }

    @Delete('questions/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.questions.remove(userId, id);
    }
}
