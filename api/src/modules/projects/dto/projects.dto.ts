import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ProjectDifficulty, ProjectStatus } from 'generated/prisma';
import { z } from 'zod';
import { CONTENT_LANGUAGE_CODES } from '@/shared/i18n/languages';

export class CreateProjectDto {
    @ApiProperty({ example: 'Biology — Final Exam' })
    @IsString()
    @MinLength(1)
    @MaxLength(160)
    title: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    description?: string;

    @ApiProperty({ required: false, example: 'Biology' })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    subject?: string;

    @ApiProperty({ required: false, enum: CONTENT_LANGUAGE_CODES, example: 'en', description: 'Language of all generated content and AI tutor replies for this project' })
    @IsOptional()
    @IsIn(CONTENT_LANGUAGE_CODES)
    language?: string;

    @ApiProperty({ required: false, example: '2027-06-20' })
    @IsOptional()
    @IsDateString()
    exam_date?: string | null;

    @ApiProperty({ required: false, minimum: 1, maximum: 100, example: 85 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    target_score?: number;

    @ApiProperty({ required: false, enum: ProjectDifficulty })
    @IsOptional()
    @IsEnum(ProjectDifficulty)
    difficulty?: ProjectDifficulty;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(40, { each: true })
    tags?: string[];

    @ApiProperty({ required: false, enum: ProjectStatus })
    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    @ApiProperty({ required: false, minimum: 5, maximum: 480 })
    @IsOptional()
    @IsInt()
    @Min(5)
    @Max(480)
    daily_minutes_goal?: number;

    @ApiProperty({ required: false, minimum: 1, maximum: 7 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(7)
    weekly_days_target?: number;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) { }

export const ProjectQuerySchema = z.object({
    view: z.enum(['active', 'archived', 'all']).optional().default('active'),
    search: z.string().trim().max(120).optional(),
});
export type ProjectQueryType = z.infer<typeof ProjectQuerySchema>;
