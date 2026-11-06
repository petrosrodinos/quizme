import type { RoleType } from "@/features/user/interfaces/user.interface";

export interface AuthUser {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: RoleType;
    timezone: string;
    email_verified: boolean;
    created_at: string;
}

export interface AuthSession {
    access_token: string;
    expires_in: number;
    user: AuthUser;
}

export interface SignInDto {
    email: string;
    password: string;
}

export interface SignUpDto {
    email: string;
    password: string;
    full_name?: string;
    timezone?: string;
}

export interface ResetPasswordDto {
    token: string;
    password: string;
}

export interface ChangePasswordDto {
    current_password: string;
    new_password: string;
}

export interface ActiveSession {
    id: string;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
    last_used_at: string;
    current: boolean;
}

export interface MessageResponse {
    message: string;
}
