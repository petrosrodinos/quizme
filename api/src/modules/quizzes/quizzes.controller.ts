import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { QuizzesService } from './quizzes.service';
import { AttemptQuerySchema, type AttemptQueryType, CreateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';

@ApiTags('Quizzes')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class QuizzesController {
    constructor(private readonly quizzes: QuizzesService) { }

    @Post('projects/:projectId/quizzes')
    @Throttle({ default: { limit: 15, ttl: 60_000 } })
    @ApiOperation({ summary: 'Create a quiz (practice/adaptive/review/exam/selection); questions are generated in the background' })
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateQuizDto) {
        return this.quizzes.create(userId, projectId, dto);
    }

    @Get('projects/:projectId/quizzes')
    list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.quizzes.list(userId, projectId);
    }

    @Get('projects/:projectId/attempts')
    @ApiOperation({ summary: 'Quiz attempt history for the current user' })
    history(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(AttemptQuerySchema)) q: AttemptQueryType) {
        return this.quizzes.history(userId, projectId, q);
    }

    @Get('projects/:projectId/review')
    @ApiOperation({ summary: 'Wrong-answer review overview' })
    review(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.quizzes.reviewOverview(userId, projectId);
    }

    @Get('quizzes/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.get(userId, id);
    }

    @Delete('quizzes/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.remove(userId, id);
    }

    @Post('quizzes/:id/share')
    @HttpCode(200)
    share(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.share(userId, id);
    }

    @Get('quizzes/:id/results')
    @ApiOperation({ summary: 'Group results for a shared quiz' })
    results(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.groupResults(userId, id);
    }

    @Post('quizzes/:id/attempts')
    @ApiOperation({ summary: 'Start (or resume) an attempt' })
    start(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.startAttempt(userId, id);
    }

    @Get('attempts/:id')
    attempt(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.getAttempt(userId, id);
    }

    @Post('attempts/:id/answers')
    @HttpCode(200)
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({ summary: 'Submit an answer; graded server-side (feedback withheld in exam mode)' })
    answer(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitAnswerDto) {
        return this.quizzes.submitAnswer(userId, id, dto);
    }

    @Post('attempts/:id/complete')
    @HttpCode(200)
    complete(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.complete(userId, id);
    }

    @Get('attempts/:id/summary')
    summary(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.quizzes.summary(userId, id);
    }
}
