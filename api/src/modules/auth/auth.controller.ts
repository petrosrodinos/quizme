import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser, type AuthUser } from '@/shared/decorators/current-user.decorator';
import { AuthService, RequestMeta } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';

const meta = (req: Request): RequestMeta => ({ ip: req.ip, userAgent: req.headers['user-agent'] });
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Post('register')
    @Throttle(AUTH_LIMIT)
    @ApiOperation({ summary: 'Create an account with email and password' })
    register(@Body() dto: RegisterDto, @Req() req: Request) {
        return this.auth.register(dto, meta(req));
    }

    @Post('login')
    @HttpCode(200)
    @Throttle(AUTH_LIMIT)
    @ApiOperation({ summary: 'Sign in with email and password' })
    login(@Body() dto: LoginDto, @Req() req: Request) {
        return this.auth.login(dto, meta(req));
    }

    @Post('google')
    @HttpCode(200)
    @Throttle(AUTH_LIMIT)
    @ApiOperation({ summary: 'Sign in with a Google ID token' })
    google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
        return this.auth.loginWithGoogle(dto, meta(req));
    }

    @Post('forgot-password')
    @HttpCode(200)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiOperation({ summary: 'Request a password reset email' })
    forgot(@Body() dto: ForgotPasswordDto) {
        return this.auth.forgotPassword(dto);
    }

    @Post('reset-password')
    @HttpCode(200)
    @Throttle(AUTH_LIMIT)
    @ApiOperation({ summary: 'Reset password using the emailed token' })
    reset(@Body() dto: ResetPasswordDto) {
        return this.auth.resetPassword(dto);
    }

    @Post('verify-email')
    @HttpCode(200)
    @Throttle(AUTH_LIMIT)
    @ApiOperation({ summary: 'Verify email address using the emailed token' })
    verify(@Body() dto: VerifyEmailDto) {
        return this.auth.verifyEmail(dto.token);
    }

    @Post('resend-verification')
    @HttpCode(200)
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    resend(@CurrentUser('id') userId: string) {
        return this.auth.resendVerification(userId);
    }

    @Get('me')
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    me(@CurrentUser('id') userId: string) {
        return this.auth.me(userId);
    }

    @Post('logout')
    @HttpCode(200)
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke the current session' })
    logout(@CurrentUser() user: AuthUser) {
        return this.auth.logout(user.id, user.sid);
    }

    @Post('change-password')
    @HttpCode(200)
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
        return this.auth.changePassword(user.id, user.sid, dto);
    }

    @Get('sessions')
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List active sessions' })
    sessions(@CurrentUser() user: AuthUser) {
        return this.auth.listSessions(user.id, user.sid);
    }

    @Delete('sessions/:id')
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    revoke(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.auth.revokeSession(userId, id);
    }

    @Post('sessions/revoke-others')
    @HttpCode(200)
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    revokeOthers(@CurrentUser() user: AuthUser) {
        return this.auth.revokeOtherSessions(user.id, user.sid);
    }
}
