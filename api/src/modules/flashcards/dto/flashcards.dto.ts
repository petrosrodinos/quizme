import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CardStatus, ReviewRating } from 'generated/prisma';
import { z } from 'zod';

export class CreateDeckDto {
    @ApiProperty({ required: false, nullable: true, description: 'Lesson to file this deck under' }) @IsOptional() @IsUUID() lesson_id?: string;
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
export class UpdateDeckDto extends PartialType(CreateDeckDto) { }

export class CreateFlashcardDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) front: string;
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(4000) back: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() deck_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() topic_id?: string;
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) tags?: string[];
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) category?: string;
    @ApiProperty({ required: false, minimum: 1, maximum: 5 }) @IsOptional() @IsInt() @Min(1) @Max(5) difficulty?: number;
}
export class UpdateFlashcardDto extends PartialType(CreateFlashcardDto) { }

export class GenerateFlashcardsDto {
    @ApiProperty({ default: 15, minimum: 1, maximum: 60 }) @IsOptional() @IsInt() @Min(1) @Max(60) count?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(12000) selection_text?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() selection_document_id?: string;
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsUUID('all', { each: true }) document_ids?: string[];
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsUUID('all', { each: true }) topic_ids?: string[];
    @ApiProperty({ required: false, type: [String], description: 'Generate from these notes' }) @IsOptional() @IsArray() @IsUUID('all', { each: true }) note_ids?: string[];
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() deck_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) instructions?: string;
}

export class ReviewCardDto {
    @ApiProperty({ enum: ReviewRating }) @IsEnum(ReviewRating) rating: ReviewRating;
    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(600_000) time_spent_ms?: number;
}

export const FlashcardQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    deck_id: z.string().uuid().optional(),
    topic_id: z.string().uuid().optional(),
    tag: z.string().max(40).optional(),
    status: z.nativeEnum(CardStatus).optional(),
    search: z.string().trim().max(200).optional(),
});
export type FlashcardQueryType = z.infer<typeof FlashcardQuerySchema>;

export const ReviewQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional().default(30),
    deck_id: z.string().uuid().optional(),
    new_limit: z.coerce.number().int().min(0).max(100).optional().default(15),
});
export type ReviewQueryType = z.infer<typeof ReviewQuerySchema>;
