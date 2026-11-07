import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CurriculumService, LessonItemType } from './curriculum.service';

const ITEM_TYPES = ['document', 'quiz', 'deck', 'note', 'summary', 'question'];

export class CreateUnitDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) title: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
export class UpdateUnitDto extends PartialType(CreateUnitDto) { }

export class CreateLessonDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) title: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
export class UpdateLessonDto extends PartialType(CreateLessonDto) { }

export class ReorderUnitDto {
    @ApiProperty() @IsUUID() id: string;
    @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(500) @IsUUID('all', { each: true }) lesson_ids: string[];
}
export class ReorderCurriculumDto {
    @ApiProperty({ type: [ReorderUnitDto] })
    @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => ReorderUnitDto)
    units: ReorderUnitDto[];
}

export class AssignItemsDto {
    @ApiProperty({ enum: ITEM_TYPES }) @IsEnum(ITEM_TYPES) type: LessonItemType;
    @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(500) @IsUUID('all', { each: true }) ids: string[];
}

@ApiTags('Curriculum')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class CurriculumController {
    constructor(private readonly curriculum: CurriculumService) { }

    @Get('projects/:projectId/curriculum')
    @ApiOperation({ summary: 'Course structure: units → lessons with content counts, plus unsorted counts' })
    tree(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.curriculum.tree(userId, projectId);
    }

    @Put('projects/:projectId/curriculum/order')
    @ApiOperation({ summary: 'Bulk reorder units and lessons (also moves lessons between units)' })
    reorder(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: ReorderCurriculumDto) {
        return this.curriculum.reorder(userId, projectId, dto);
    }

    @Post('projects/:projectId/units')
    createUnit(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateUnitDto) {
        return this.curriculum.createUnit(userId, projectId, dto);
    }

    @Patch('units/:id')
    updateUnit(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
        return this.curriculum.updateUnit(userId, id, dto);
    }

    @Delete('units/:id')
    removeUnit(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.curriculum.removeUnit(userId, id);
    }

    @Post('units/:unitId/lessons')
    createLesson(@CurrentUser('id') userId: string, @Param('unitId', ParseUUIDPipe) unitId: string, @Body() dto: CreateLessonDto) {
        return this.curriculum.createLesson(userId, unitId, dto);
    }

    @Get('lessons/:id')
    @ApiOperation({ summary: 'Lesson with its documents, quizzes, decks, notes and summaries' })
    getLesson(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.curriculum.getLesson(userId, id);
    }

    @Patch('lessons/:id')
    updateLesson(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLessonDto) {
        return this.curriculum.updateLesson(userId, id, dto);
    }

    @Delete('lessons/:id')
    removeLesson(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.curriculum.removeLesson(userId, id);
    }

    @Patch('lessons/:id/items')
    @ApiOperation({ summary: 'Assign content to this lesson' })
    assign(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignItemsDto) {
        return this.curriculum.assignItems(userId, id, dto.type, dto.ids);
    }

    @Patch('projects/:projectId/curriculum/unassign')
    @ApiOperation({ summary: 'Move content back to Unsorted' })
    unassign(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: AssignItemsDto) {
        return this.curriculum.unassignItems(userId, projectId, dto.type, dto.ids);
    }
}
