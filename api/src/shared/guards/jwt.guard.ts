import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    getRequest(context: ExecutionContext) {
        return context.switchToHttp().getRequest();
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            const expired = info?.name === 'TokenExpiredError';
            throw new UnauthorizedException({
                message: expired ? 'Session expired' : 'Authentication required',
                code: expired ? 'token_expired' : 'authentication_required',
            });
        }
        return user;
    }
}
