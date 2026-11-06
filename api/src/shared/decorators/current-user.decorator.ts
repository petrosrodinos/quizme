import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
    id: string;
    role: string;
    sid: string;
}

export const CurrentUser = createParamDecorator((field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return field ? user?.[field] : user;
});
