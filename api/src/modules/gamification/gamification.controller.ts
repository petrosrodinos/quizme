import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { z } from 'zod';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { GamificationService } from './gamification.service';
import type { DailyGoalType } from './gamification.config';

export class DailyGoalDto {
    @ApiProperty({ enum: ['CASUAL', 'REGULAR', 'SERIOUS', 'INTENSE', 'CUSTOM'] })
    @IsIn(['CASUAL', 'REGULAR', 'SERIOUS', 'INTENSE', 'CUSTOM'])
    type: DailyGoalType;

    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(5) @Max(480) minutes?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(20) @Max(5000) xp?: number;
}

const ActivityQuerySchema = z.object({ days: z.coerce.number().int().min(7).max(365).optional().default(30) });

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('gamification')
export class GamificationController {
    constructor(
        private readonly gamification: GamificationService,
        private readonly access: ProjectAccessService,
    ) { }

    @Get('profile')
    @ApiOperation({ summary: 'XP, level, streak, freezes and daily goal progress' })
    profile(@CurrentUser('id') userId: string) {
        return this.gamification.profile(userId);
    }

    @Patch('daily-goal')
    dailyGoal(@CurrentUser('id') userId: string, @Body() dto: DailyGoalDto) {
        return this.gamification.setDailyGoal(userId, dto.type, dto.minutes, dto.xp);
    }

    @Get('achievements')
    achievements(@CurrentUser('id') userId: string) {
        return this.gamification.achievements(userId);
    }

    @Get('activity')
    @ApiOperation({ summary: 'Daily XP / minutes / goal history (for calendars and charts)' })
    activity(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(ActivityQuerySchema)) q: { days: number }) {
        return this.gamification.activity(userId, q.days);
    }

    @Get('leaderboard/:projectId')
    @ApiOperation({ summary: 'Weekly opt-in XP leaderboard for a shared project' })
    async leaderboard(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        return this.gamification.leaderboard(userId, projectId);
    }
}
