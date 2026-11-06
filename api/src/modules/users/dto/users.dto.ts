import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    full_name?: string;

    @ApiProperty({ required: false, example: 'Europe/Athens' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    timezone?: string;
}

export class UpdatePreferencesDto {
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() sound_enabled?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(100) volume?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() sound_feedback?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() sound_celebrations?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() sound_timers?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() animations_enabled?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() haptics_enabled?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() focus_mode?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() leaderboard_opt_in?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() achievement_popups?: boolean;
    @ApiProperty({ required: false, enum: ['en', 'el'], description: 'UI, email and notification language' }) @IsOptional() @IsIn(['en', 'el']) language?: 'en' | 'el';

    @ApiProperty({
        required: false,
        description:
            'Notification toggles: study_reminders, flashcards_due, invitations, collaboration, quiz_completion, goals, exams, streak_risk, achievements, email',
    })
    @IsOptional()
    @IsObject()
    notification_prefs?: Record<string, boolean>;
}

export class DeleteAccountDto {
    @ApiProperty({ description: 'Type DELETE to confirm' })
    @IsString()
    confirm: string;
}
