import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { QuestionType } from 'generated/prisma';
import { z } from 'zod';

export class CreateQuestionDto {
    @ApiProperty({ enum: QuestionType }) @IsEnum(QuestionType) type: QuestionType;
    @ApiProperty() @IsString() @MinLength(5) @MaxLength(2000) prompt: string;
    @ApiProperty({
        description:
            'MCQ/MULTI_SELECT {options[],correct[]}; TRUE_FALSE {correct}; FILL_BLANK {answers[]}; MATCHING {pairs[{left,right}]}; ORDERING {items[]}; FREE_TEXT {expected_answer,key_concepts[]}',
    })
    @IsObject()
    data: Record<string, unknown>;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(4000) explanation?: string;
    @ApiProperty({ required: false, minimum: 1, maximum: 5 }) @IsOptional() @IsInt() @Min(1) @Max(5) difficulty?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) concept?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() topic_id?: string;
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) tags?: string[];
}

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) { }

export const QuestionQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().max(200).optional(),
    type: z.nativeEnum(QuestionType).optional(),
    difficulty: z.coerce.number().int().min(1).max(5).optional(),
    topic_id: z.string().uuid().optional(),
    tag: z.string().max(40).optional(),
    origin: z.enum(['AI', 'MANUAL', 'IMPORTED']).optional(),
    missed: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});
export type QuestionQueryType = z.infer<typeof QuestionQuerySchema>;
