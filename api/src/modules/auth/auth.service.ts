import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { MailService } from '@/integrations/notifications/mail/mail.service';
import { AuditActions, AuditService } from '@/shared/audit/audit.service';
import { AppUrls } from '@/shared/config/app-urls';
import { randomToken, sha256 } from '@/shared/utils/hash.utils';
import { safeZone } from '@/shared/utils/date.utils';
import { ChangePasswordDto, ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtStrategy } from './jwt.strategy';

export interface RequestMeta {
    ip?: string;
    userAgent?: string;
}

const RESET_TOKEN_TTL_MS = 60 * 60_000;
const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60_000;
const BCRYPT_ROUNDS = 12;

export const publicUser = (user: User) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    role: user.role,
    timezone: user.timezone,
    email_verified: !!user.email_verified_at,
    created_at: user.created_at,
});

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly sessionTtlMs: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
        private readonly audit: AuditService,
        private readonly jwtStrategy: JwtStrategy,
    ) {
        this.sessionTtlMs = this.parseDuration(config.get<string>('JWT_EXPIRATION_TIME') || '30d');
    }

    async register(dto: RegisterDto, meta: RequestMeta) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('An account with this email already exists');

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
                full_name: dto.full_name?.trim() || null,
                timezone: safeZone(dto.timezone),
                preferences: { create: {} },
                gamification: { create: {} },
            },
        });
        this.audit.log({ userId: user.id, action: AuditActions.USER_REGISTERED, ip: meta.ip });
        setImmediate(async () => {
            try {
                await this.sendVerificationEmail(user);
            } catch (error) {
                this.logger.warn(`Verification email failed: ${error?.message}`);
            }
        });
        return this.issueSession(user, meta);
    }

    async login(dto: LoginDto, meta: RequestMeta) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        const ok = !!user?.password && (await bcrypt.compare(dto.password, user.password));
        if (!user || !ok) {
            this.audit.log({ userId: user?.id, action: AuditActions.USER_LOGIN_FAILED, ip: meta.ip, metadata: { email: dto.email } });
            throw new UnauthorizedException('Invalid email or password');
        }
        this.audit.log({ userId: user.id, action: AuditActions.USER_LOGIN, ip: meta.ip });
        return this.issueSession(user, meta);
    }

    /** Verifies a Google ID token (audience-checked) and signs the user in, linking by verified email. */
    async loginWithGoogle(dto: GoogleLoginDto, meta: RequestMeta) {
        const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        if (!clientId) throw new BadRequestException('Google sign-in is not configured');
        let info: { aud: string; sub: string; email: string; email_verified: string | boolean; name?: string; picture?: string };
        try {
            const res = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: dto.id_token }, timeout: 8000 });
            info = res.data;
        } catch {
            throw new UnauthorizedException('Invalid Google credential');
        }
        if (info.aud !== clientId || !(info.email_verified === true || info.email_verified === 'true')) {
            throw new UnauthorizedException('Invalid Google credential');
        }
        const email = info.email.toLowerCase();
        let user = await this.prisma.user.findFirst({ where: { OR: [{ google_id: info.sub }, { email }] } });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email,
                    google_id: info.sub,
                    full_name: info.name ?? null,
                    avatar_url: info.picture ?? null,
                    email_verified_at: new Date(),
                    timezone: safeZone(dto.timezone),
                    preferences: { create: {} },
                    gamification: { create: {} },
                },
            });
            this.audit.log({ userId: user.id, action: AuditActions.USER_REGISTERED, ip: meta.ip, metadata: { provider: 'google' } });
        } else if (!user.google_id) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { google_id: info.sub, email_verified_at: user.email_verified_at ?? new Date() },
            });
        }
        this.audit.log({ userId: user.id, action: AuditActions.USER_LOGIN, ip: meta.ip, metadata: { provider: 'google' } });
        return this.issueSession(user, meta);
    }

    async logout(userId: string, sessionId: string) {
        await this.prisma.session.updateMany({ where: { id: sessionId, user_id: userId }, data: { revoked_at: new Date() } });
        this.jwtStrategy.invalidate(sessionId);
        this.audit.log({ userId, action: AuditActions.USER_LOGOUT });
        return { success: true };
    }

    async listSessions(userId: string, currentSessionId: string) {
        const sessions = await this.prisma.session.findMany({
            where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
            orderBy: { last_used_at: 'desc' },
        });
        return sessions.map((s) => ({
            id: s.id,
            user_agent: s.user_agent,
            ip_address: s.ip_address,
            created_at: s.created_at,
            last_used_at: s.last_used_at,
            current: s.id === currentSessionId,
        }));
    }

    async revokeSession(userId: string, sessionId: string) {
        const res = await this.prisma.session.updateMany({ where: { id: sessionId, user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
        if (!res.count) throw new BadRequestException('Session not found');
        this.jwtStrategy.invalidate(sessionId);
        this.audit.log({ userId, action: AuditActions.SESSION_REVOKED, resourceId: sessionId });
        return { success: true };
    }

    async revokeOtherSessions(userId: string, currentSessionId: string) {
        const sessions = await this.prisma.session.findMany({ where: { user_id: userId, revoked_at: null, id: { not: currentSessionId } } });
        await this.prisma.session.updateMany({ where: { id: { in: sessions.map((s) => s.id) } }, data: { revoked_at: new Date() } });
        sessions.forEach((s) => this.jwtStrategy.invalidate(s.id));
        return { revoked: sessions.length };
    }

    async me(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException();
        return publicUser(user);
    }

    async changePassword(userId: string, sessionId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.password || !(await bcrypt.compare(dto.current_password, user.password))) {
            throw new BadRequestException('Current password is incorrect');
        }
        await this.prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(dto.new_password, BCRYPT_ROUNDS) } });
        await this.revokeOtherSessions(userId, sessionId);
        this.audit.log({ userId, action: AuditActions.PASSWORD_CHANGED });
        return { success: true };
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (user) {
            const token = randomToken();
            await this.prisma.$transaction([
                this.prisma.passwordResetToken.updateMany({ where: { user_uuid: user.id, used_at: null }, data: { used_at: new Date() } }),
                this.prisma.passwordResetToken.create({
                    data: { token_hash: sha256(token), user_uuid: user.id, expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
                }),
            ]);
            setImmediate(async () => {
                try {
                    await this.mail.send({
                        to: user.email,
                        subject: 'Reset your QuizMe password',
                        heading: 'Reset your password',
                        body: 'We received a request to reset your password. This link expires in 1 hour. If you did not request this, you can ignore this email.',
                        cta: { label: 'Reset password', url: AppUrls.resetPassword(token) },
                    });
                } catch (error) {
                    this.logger.warn(`Reset email failed: ${error?.message}`);
                }
            });
        }
        return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const record = await this.prisma.passwordResetToken.findUnique({ where: { token_hash: sha256(dto.token) } });
        if (!record || record.used_at || record.expires_at < new Date()) throw new BadRequestException('Invalid or expired reset link');
        const sessions = await this.prisma.session.findMany({ where: { user_id: record.user_uuid, revoked_at: null } });
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: record.user_uuid }, data: { password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS) } }),
            this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used_at: new Date() } }),
            this.prisma.session.updateMany({ where: { user_id: record.user_uuid, revoked_at: null }, data: { revoked_at: new Date() } }),
        ]);
        sessions.forEach((s) => this.jwtStrategy.invalidate(s.id));
        this.audit.log({ userId: record.user_uuid, action: AuditActions.PASSWORD_RESET });
        return { message: 'Your password has been reset. Please sign in.' };
    }

    async sendVerificationEmail(user: Pick<User, 'id' | 'email' | 'email_verified_at'>) {
        if (user.email_verified_at) return { message: 'Email already verified' };
        const token = randomToken();
        await this.prisma.emailVerificationToken.create({
            data: { token_hash: sha256(token), user_id: user.id, expires_at: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) },
        });
        await this.mail.send({
            to: user.email,
            subject: 'Verify your email for QuizMe',
            heading: 'Confirm your email',
            body: 'Welcome to QuizMe! Please confirm your email address to secure your account.',
            cta: { label: 'Verify email', url: AppUrls.verifyEmail(token) },
        });
        return { message: 'Verification email sent' };
    }

    async resendVerification(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException();
        return this.sendVerificationEmail(user);
    }

    async verifyEmail(token: string) {
        const record = await this.prisma.emailVerificationToken.findUnique({ where: { token_hash: sha256(token) } });
        if (!record || record.used_at || record.expires_at < new Date()) throw new BadRequestException('Invalid or expired verification link');
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: record.user_id }, data: { email_verified_at: new Date() } }),
            this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used_at: new Date() } }),
        ]);
        this.audit.log({ userId: record.user_id, action: AuditActions.EMAIL_VERIFIED });
        return { message: 'Email verified' };
    }

    private async issueSession(user: User, meta: RequestMeta) {
        const expiresAt = new Date(Date.now() + this.sessionTtlMs);
        const session = await this.prisma.session.create({
            data: { user_id: user.id, ip_address: meta.ip?.slice(0, 64), user_agent: meta.userAgent?.slice(0, 300), expires_at: expiresAt },
        });
        await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
        const access_token = await this.jwt.signAsync(
            { id: user.id, role: user.role, sid: session.id },
            { secret: this.config.get('JWT_SECRET'), expiresIn: Math.floor(this.sessionTtlMs / 1000) },
        );
        return { access_token, expires_in: Math.floor(expiresAt.getTime() / 1000), user: publicUser(user) };
    }

    private parseDuration(value: string): number {
        const m = /^(\d+)\s*([smhd])?$/.exec(value.trim());
        if (!m) return 30 * 86_400_000;
        const n = Number(m[1]);
        const unit = m[2] ?? 's';
        return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
    }
}
