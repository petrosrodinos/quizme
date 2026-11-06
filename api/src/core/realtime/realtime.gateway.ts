import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    OnGatewayConnection,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RealtimeService } from './realtime.service';

export interface SocketUser {
    id: string;
    role: string;
    sid: string;
}

/** Single authenticated Socket.IO gateway. Every socket joins its private `user:<id>` room;
 * feature gateways (study rooms, multiplayer) layer their own events on the same server. */
@WebSocketGateway({ cors: { origin: true, credentials: true }, path: '/socket.io' })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
    private readonly logger = new Logger(RealtimeGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly realtime: RealtimeService,
    ) { }

    afterInit(server: Server) {
        this.realtime.bind(server);
        server.use(async (socket, next) => {
            try {
                const raw =
                    (socket.handshake.auth?.token as string) ||
                    (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
                if (!raw) return next(new Error('unauthorized'));
                const payload = await this.jwt.verifyAsync(raw, { secret: this.config.get('JWT_SECRET') });
                const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
                if (!session || session.revoked_at || session.expires_at < new Date()) {
                    return next(new Error('unauthorized'));
                }
                (socket.data as any).user = { id: payload.id, role: payload.role, sid: payload.sid } as SocketUser;
                next();
            } catch {
                next(new Error('unauthorized'));
            }
        });
    }

    handleConnection(socket: Socket) {
        const user = (socket.data as any).user as SocketUser | undefined;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        void socket.join(`user:${user.id}`);
    }
}
