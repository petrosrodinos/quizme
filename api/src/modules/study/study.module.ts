import { Body, Controller, Get, Global, HttpCode, Module, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { StudyActivityType } from 'generated/prisma';
import { z } from 'zod';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { StudyService } from './study.service';

export class LogActivityDto {
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() project_id?: string;
    @ApiProperty({ enum: StudyActivityType }) @IsEnum(StudyActivityType) type: StudyActivityType;
    @ApiProperty({ minimum: 1, maximum: 300, description: 'Seconds of active study since the last heartbeat' }) @IsInt() @Min(1) @Max(300) seconds: number;
}

const SessionQuerySchema = z.object({ project_id: z.string().uuid().optional() });

@ApiTags('Study')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class StudyController {
    constructor(
        private readonly study: StudyService,
        private readonly access: ProjectAccessService,
    ) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'User dashboard: today, streak, projects, exams, scores, weak topics' })
    dashboard(@CurrentUser('id') userId: string) {
        return this.study.dashboard(userId);
    }

    @Get('study/session')
    @ApiOperation({ summary: "Today's personalized study session (optionally for one project)" })
    session(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(SessionQuerySchema)) q: { project_id?: string }) {
        return this.study.dailySession(userId, q.project_id);
    }

    @Post('study/session/complete')
    @HttpCode(200)
    complete(@CurrentUser('id') userId: string) {
        return this.study.completeDailySession(userId);
    }

    @Post('study/activity')
    @HttpCode(200)
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    @ApiOperation({ summary: 'Study-time heartbeat (capped at 300s per call)' })
    activity(@CurrentUser('id') userId: string, @Body() dto: LogActivityDto) {
        return this.study.logActivity(userId, dto);
    }

    @Get('projects/:projectId/overview')
    overview(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.study.overview(userId, projectId);
    }

    @Get('projects/:projectId/readiness')
    @ApiOperation({ summary: 'Exam readiness score with factors and blockers' })
    async readiness(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        return this.study.readiness(userId, projectId);
    }

    @Get('projects/:projectId/plan')
    @ApiOperation({ summary: 'Adaptive study plan towards the exam date and target score' })
    plan(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.study.plan(userId, projectId);
    }

    @Get('projects/:projectId/progress')
    @ApiOperation({ summary: 'Learning analytics for the project' })
    progress(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.study.progress(userId, projectId);
    }
}

@Global()
@Module({ controllers: [StudyController], providers: [StudyService], exports: [StudyService] })
export class StudyModule { }
