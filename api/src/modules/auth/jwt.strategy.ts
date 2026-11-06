import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/decorators/current-user.decorator';

interface CachedSession {
    valid: boolean;
    checkedAt: number;
}

/** Validates the bearer JWT and that its server-side session is still active (supports logout & revocation). */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly cache = new Map<string, CachedSession>();
    private static readonly CACHE_MS = 20_000;

    constructor(
        config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get('JWT_SECRET'),
            ignoreExpiration: false,
        });
    }

    async validate(payload: { id: string; role: string; sid: string }): Promise<AuthUser> {
        if (!payload?.id || !payload?.sid) throw new UnauthorizedException('Invalid token');
        const cached = this.cache.get(payload.sid);
        const now = Date.now();
        if (cached && now - cached.checkedAt < JwtStrategy.CACHE_MS) {
            if (!cached.valid) throw new UnauthorizedException('Session revoked');
            return { id: payload.id, role: payload.role, sid: payload.sid };
        }
        const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
        const valid = !!session && !session.revoked_at && session.expires_at > new Date() && session.user_id === payload.id;
        this.cache.set(payload.sid, { valid, checkedAt: now });
        if (this.cache.size > 10_000) this.cache.clear();
        if (!valid) throw new UnauthorizedException('Session revoked');
        if (session && now - session.last_used_at.getTime() > 5 * 60_000) {
            void this.prisma.session.update({ where: { id: session.id }, data: { last_used_at: new Date() } }).catch(() => undefined);
        }
        return { id: payload.id, role: payload.role, sid: payload.sid };
    }

    invalidate(sessionId: string) {
        this.cache.set(sessionId, { valid: false, checkedAt: Date.now() });
    }
}
