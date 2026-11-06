import { Body, Controller, Get, Global, HttpCode, Module, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WsException } from '@nestjs/websockets';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Socket } from 'socket.io';
import { z } from 'zod';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import type { SocketUser } from '@/core/realtime/realtime.gateway';
import { RoomsService } from './rooms.service';

export class CreateRoomDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) name: string;
}

export class CreateGameDto {
    @ApiProperty() @IsUUID() quiz_id: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() room_id?: string;
    @ApiProperty({ required: false, minimum: 10, maximum: 120 }) @IsOptional() @IsInt() @Min(10) @Max(120) seconds_per_question?: number;
}

@ApiTags('Study rooms & multiplayer')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class RoomsController {
    constructor(private readonly rooms: RoomsService) { }

    @Get('rooms')
    list(@CurrentUser('id') userId: string, @Query(new ZodValidationPipe(z.object({ project_id: z.string().uuid().optional() }))) q: { project_id?: string }) {
        return this.rooms.list(userId, q.project_id);
    }

    @Post('projects/:projectId/rooms')
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateRoomDto) {
        return this.rooms.create(userId, projectId, dto.name);
    }

    @Get('rooms/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.rooms.get(userId, id);
    }

    @Post('rooms/:id/close')
    @HttpCode(200)
    close(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.rooms.close(userId, id);
    }

    @Post('projects/:projectId/games')
    @ApiOperation({ summary: 'Create a multiplayer quiz game from a ready quiz' })
    createGame(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateGameDto) {
        return this.rooms.createGame(userId, projectId, dto);
    }

    @Get('games/:id')
    async game(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        await this.rooms.assertGameAccess(userId, id);
        return this.rooms.gameState(id, userId);
    }
}

type Ack<T> = T | { error: string };

/** Socket events for rooms/games. All handlers authorize via RoomsService (project membership). */
@WebSocketGateway({ cors: { origin: true, credentials: true }, path: '/socket.io' })
export class RoomsGateway implements OnGatewayDisconnect {
    constructor(private readonly rooms: RoomsService) { }

    private user(socket: Socket): SocketUser {
        const u = (socket.data as any)?.user as SocketUser | undefined;
        if (!u) throw new WsException('unauthorized');
        return u;
    }

    private async safe<T>(fn: () => Promise<T>): Promise<Ack<T>> {
        try {
            return await fn();
        } catch (error) {
            return { error: error?.response?.message ?? error?.message ?? 'Something went wrong' };
        }
    }

    async handleDisconnect(socket: Socket) {
        const u = (socket.data as any)?.user as SocketUser | undefined;
        const joined: string[] = (socket.data as any)?.rooms ?? [];
        if (u) for (const roomId of joined) await this.rooms.leave(u.id, roomId).catch(() => undefined);
    }

    @SubscribeMessage('room:join')
    join(@ConnectedSocket() socket: Socket, @MessageBody() body: { room_id: string }) {
        return this.safe(async () => {
            const u = this.user(socket);
            const state = await this.rooms.join(u.id, body.room_id);
            await socket.join(`room:${body.room_id}`);
            const data = socket.data as any;
            data.rooms = [...new Set([...(data.rooms ?? []), body.room_id])];
            return state;
        });
    }

    @SubscribeMessage('room:leave')
    leave(@ConnectedSocket() socket: Socket, @MessageBody() body: { room_id: string }) {
        return this.safe(async () => {
            const u = this.user(socket);
            await socket.leave(`room:${body.room_id}`);
            const data = socket.data as any;
            data.rooms = (data.rooms ?? []).filter((r: string) => r !== body.room_id);
            await this.rooms.leave(u.id, body.room_id);
            return { ok: true };
        });
    }

    @SubscribeMessage('room:message')
    message(@ConnectedSocket() socket: Socket, @MessageBody() body: { room_id: string; content: string }) {
        return this.safe(() => this.rooms.message(this.user(socket).id, body.room_id, String(body.content ?? '')));
    }

    @SubscribeMessage('room:timer')
    timer(@ConnectedSocket() socket: Socket, @MessageBody() body: { room_id: string; action: 'start' | 'pause' | 'reset'; minutes?: number; mode?: 'focus' | 'break' }) {
        return this.safe(() => this.rooms.timerAction(this.user(socket).id, body.room_id, body.action, body.minutes, body.mode));
    }

    @SubscribeMessage('room:notes')
    notes(@ConnectedSocket() socket: Socket, @MessageBody() body: { room_id: string; content: string }) {
        return this.safe(() => this.rooms.updateNotes(this.user(socket).id, body.room_id, String(body.content ?? '')));
    }

    @SubscribeMessage('game:join')
    joinGame(@ConnectedSocket() socket: Socket, @MessageBody() body: { game_id: string }) {
        return this.safe(async () => {
            const state = await this.rooms.joinGame(this.user(socket).id, body.game_id);
            await socket.join(`game:${body.game_id}`);
            return state;
        });
    }

    @SubscribeMessage('game:start')
    start(@ConnectedSocket() socket: Socket, @MessageBody() body: { game_id: string }) {
        return this.safe(() => this.rooms.startGame(this.user(socket).id, body.game_id));
    }

    @SubscribeMessage('game:answer')
    answer(@ConnectedSocket() socket: Socket, @MessageBody() body: { game_id: string; question_id: string; answer: unknown }) {
        return this.safe(() => this.rooms.answer(this.user(socket).id, body.game_id, body.question_id, body.answer));
    }

    @SubscribeMessage('game:next')
    next(@ConnectedSocket() socket: Socket, @MessageBody() body: { game_id: string }) {
        return this.safe(() => this.rooms.skipToNext(this.user(socket).id, body.game_id));
    }

    @SubscribeMessage('game:state')
    state(@ConnectedSocket() socket: Socket, @MessageBody() body: { game_id: string }) {
        return this.safe(async () => {
            const u = this.user(socket);
            await this.rooms.joinGame(u.id, body.game_id);
            return this.rooms.gameState(body.game_id, u.id);
        });
    }
}

@Global()
@Module({ controllers: [RoomsController], providers: [RoomsService, RoomsGateway], exports: [RoomsService] })
export class RoomsModule { }
