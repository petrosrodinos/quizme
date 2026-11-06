import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { NotificationsService } from './notifications.service';

const NotificationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    unread: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});
type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notifications: NotificationsService) { }

    @Get()
    list(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(NotificationQuerySchema)) q: NotificationQuery) {
        return this.notifications.list(userId, q.page, q.limit, q.unread);
    }

    @Get('unread-count')
    unread(@CurrentUser('id') userId: string) {
        return this.notifications.unreadCount(userId);
    }

    @Post('read-all')
    @HttpCode(200)
    readAll(@CurrentUser('id') userId: string) {
        return this.notifications.markAllRead(userId);
    }

    @Post(':id/read')
    @HttpCode(200)
    read(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.notifications.markRead(userId, id);
    }

    @Delete(':id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.notifications.remove(userId, id);
    }
}
