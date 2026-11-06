import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { TopicsService } from './topics.service';

export class CreateTopicDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) name: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) description?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() parent_id?: string;
}
export class UpdateTopicDto extends PartialType(CreateTopicDto) { }

@ApiTags('Topics')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class TopicsController {
    constructor(private readonly topics: TopicsService) { }

    @Get('projects/:projectId/topics')
    @ApiOperation({ summary: 'Knowledge map: topic hierarchy with the current user mastery' })
    tree(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.topics.tree(userId, projectId);
    }

    @Post('projects/:projectId/topics/rebuild')
    rebuild(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.topics.rebuild(userId, projectId);
    }

    @Post('projects/:projectId/topics')
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateTopicDto) {
        return this.topics.create(userId, projectId, dto);
    }

    @Get('topics/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.topics.get(userId, id);
    }

    @Patch('topics/:id')
    update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTopicDto) {
        return this.topics.update(userId, id, dto);
    }

    @Delete('topics/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.topics.remove(userId, id);
    }
}
