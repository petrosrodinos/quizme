import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class RegisterDto {
    @ApiProperty({ example: 'student@example.com' })
    @Transform(lower)
    @IsEmail()
    @MaxLength(254)
    email: string;

    @ApiProperty({ minLength: 8, example: 'correct-horse-battery' })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;

    @ApiProperty({ required: false, example: 'Ada Lovelace' })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    full_name?: string;

    @ApiProperty({ required: false, example: 'Europe/Athens' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    timezone?: string;

    @ApiProperty({ required: false, enum: ['en', 'el'] })
    @IsOptional()
    @IsIn(['en', 'el'])
    language?: 'en' | 'el';
}

export class LoginDto {
    @ApiProperty({ example: 'student@example.com' })
    @Transform(lower)
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MaxLength(128)
    password: string;
}

export class GoogleLoginDto {
    @ApiProperty({ description: 'Google Identity Services ID token (credential)' })
    @IsString()
    @MaxLength(4096)
    id_token: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiProperty({ required: false, enum: ['en', 'el'] })
    @IsOptional()
    @IsIn(['en', 'el'])
    language?: 'en' | 'el';
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'student@example.com' })
    @Transform(lower)
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty()
    @IsString()
    @MinLength(10)
    token: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;
}

export class VerifyEmailDto {
    @ApiProperty()
    @IsString()
    @MinLength(10)
    token: string;
}

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    current_password: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    new_password: string;
}
