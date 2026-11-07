import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { FlashcardsService } from './flashcards.service';
import {
    CreateDeckDto,
    CreateFlashcardDto,
    FlashcardQuerySchema,
    type FlashcardQueryType,
    GenerateFlashcardsDto,
    ReviewCardDto,
    ReviewQuerySchema,
    type ReviewQueryType,
    UpdateDeckDto,
    UpdateFlashcardDto,
} from './dto/flashcards.dto';

@ApiTags('Flashcards')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class FlashcardsController {
    constructor(private readonly flashcards: FlashcardsService) { }

    @Get('projects/:projectId/decks')
    decks(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query('lessonId') lessonId?: string) {
        return this.flashcards.decks(userId, projectId, lessonId);
    }

    @Post('projects/:projectId/decks')
    createDeck(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateDeckDto) {
        return this.flashcards.createDeck(userId, projectId, dto);
    }

    @Patch('decks/:id')
    updateDeck(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeckDto) {
        return this.flashcards.updateDeck(userId, id, dto);
    }

    @Delete('decks/:id')
    removeDeck(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.flashcards.removeDeck(userId, id);
    }

    @Get('projects/:projectId/flashcards')
    list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(FlashcardQuerySchema)) q: FlashcardQueryType) {
        return this.flashcards.list(userId, projectId, q);
    }

    @Post('projects/:projectId/flashcards')
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateFlashcardDto) {
        return this.flashcards.create(userId, projectId, dto);
    }

    @Post('projects/:projectId/flashcards/generate')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOperation({ summary: 'Generate flashcards with AI (background job)' })
    generate(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: GenerateFlashcardsDto) {
        return this.flashcards.generate(userId, projectId, dto);
    }

    @Get('projects/:projectId/flashcards/review')
    @ApiOperation({ summary: 'Prioritised spaced-repetition review queue for a project' })
    queue(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(ReviewQuerySchema)) q: ReviewQueryType) {
        return this.flashcards.reviewQueue(userId, projectId, q);
    }

    @Get('projects/:projectId/flashcards/stats')
    stats(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.flashcards.stats(userId, projectId);
    }

    @Get('flashcards/review')
    @ApiOperation({ summary: 'Cross-project review queue (daily review)' })
    globalQueue(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(ReviewQuerySchema)) q: ReviewQueryType) {
        return this.flashcards.reviewQueue(userId, null, q);
    }

    @Patch('flashcards/:id')
    update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFlashcardDto) {
        return this.flashcards.update(userId, id, dto);
    }

    @Delete('flashcards/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.flashcards.remove(userId, id);
    }

    @Post('flashcards/:id/review')
    @HttpCode(200)
    @Throttle({ default: { limit: 200, ttl: 60_000 } })
    review(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewCardDto) {
        return this.flashcards.review(userId, id, dto);
    }
}
