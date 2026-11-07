import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsIn,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { QuestionType, QuizMode } from 'generated/prisma';
import { z } from 'zod';

export class ReviewConfigDto {
    @ApiProperty({ enum: ['all_incorrect', 'attempt', 'topic'] })
    @IsIn(['all_incorrect', 'attempt', 'topic'])
    source: 'all_incorrect' | 'attempt' | 'topic';

    @ApiProperty({ enum: ['retry', 'new_questions'], description: 'retry = same questions; new_questions = fresh questions on the same concepts' })
    @IsIn(['retry', 'new_questions'])
    strategy: 'retry' | 'new_questions';

    @ApiProperty({ required: false }) @IsOptional() @IsUUID() attempt_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() topic_id?: string;
}

export class CreateQuizDto {
    @ApiProperty({ required: false, description: 'Lesson to file this quiz under' }) @IsOptional() @IsUUID() lesson_id?: string;

    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) title?: string;

    @ApiProperty({ enum: QuizMode, default: QuizMode.PRACTICE })
    @IsOptional()
    @IsEnum(QuizMode)
    mode?: QuizMode;

    @ApiProperty({ default: 10, minimum: 1, maximum: 60 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60)
    count?: number;

    @ApiProperty({ enum: QuestionType, isArray: true, required: false })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(QuestionType, { each: true })
    types?: QuestionType[];

    @ApiProperty({ enum: ['easy', 'medium', 'hard', 'mixed', 'adaptive'], required: false })
    @IsOptional()
    @IsIn(['easy', 'medium', 'hard', 'mixed', 'adaptive'])
    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed' | 'adaptive';

    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsUUID('all', { each: true }) topic_ids?: string[];
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsUUID('all', { each: true }) document_ids?: string[];

    @ApiProperty({ required: false, description: 'Exam time limit in minutes' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(600)
    time_limit_min?: number;

    @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() randomize?: boolean;
    @ApiProperty({ required: false, description: 'Reuse question-bank questions where possible (exam/adaptive)' }) @IsOptional() @IsBoolean() use_bank?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) @Max(100) target_score?: number;

    @ApiProperty({ required: false, type: ReviewConfigDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ReviewConfigDto)
    review?: ReviewConfigDto;

    @ApiProperty({ required: false, description: 'SELECTION mode: generate from this selected text' })
    @IsOptional()
    @IsString()
    @MaxLength(12000)
    selection_text?: string;

    @ApiProperty({ required: false }) @IsOptional() @IsUUID() selection_document_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) instructions?: string;
    @ApiProperty({ required: false, description: 'Make the quiz visible to all project members (shared quiz)' }) @IsOptional() @IsBoolean() shared?: boolean;
}

export class SubmitAnswerDto {
    @ApiProperty() @IsUUID() question_id: string;

    @ApiProperty({ description: 'MCQ {selected:number[]}; TRUE_FALSE {value}; FILL_BLANK/FREE_TEXT {text}; MATCHING {pairs:[{left,right}]}; ORDERING {order:string[]}' })
    @IsObject()
    answer: Record<string, unknown>;

    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(3_600_000) time_spent_ms?: number;
}

export const AttemptQuerySchema = z.object({
    quiz_id: z.string().uuid().optional(),
    mode: z.nativeEnum(QuizMode).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});
export type AttemptQueryType = z.infer<typeof AttemptQuerySchema>;
