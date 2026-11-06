import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, ProjectQuerySchema, type ProjectQueryType, UpdateProjectDto } from './dto/projects.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('projects')
export class ProjectsController {
    constructor(private readonly projects: ProjectsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a study project' })
    create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
        return this.projects.create(userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List projects the user is a member of' })
    list(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(ProjectQuerySchema)) query: ProjectQueryType) {
        return this.projects.list(userId, query);
    }

    @Get(':id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.projects.get(userId, id);
    }

    @Patch(':id')
    update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
        return this.projects.update(userId, id, dto);
    }

    @Post(':id/archive')
    @HttpCode(200)
    archive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        return this.projects.setArchived(userId, id, true, req.ip);
    }

    @Post(':id/unarchive')
    @HttpCode(200)
    unarchive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.projects.setArchived(userId, id, false);
    }

    @Post(':id/duplicate')
    @ApiOperation({ summary: 'Duplicate a project (documents, topics, questions, flashcards)' })
    duplicate(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.projects.duplicate(userId, id);
    }

    @Post(':id/cover')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
    cover(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
        return this.projects.setCover(userId, id, file);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a project permanently (owner only)' })
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        return this.projects.remove(userId, id, req.ip);
    }
}
