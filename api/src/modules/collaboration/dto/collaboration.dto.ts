import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MemberRole, OrgRole, SharePermission, ShareResourceType, ShareTargetType } from 'generated/prisma';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class InviteMemberDto {
    @ApiProperty() @Transform(lower) @IsEmail() email: string;
    @ApiProperty({ enum: ['ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'] }) @IsIn(['ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER']) role: MemberRole;
}

export class UpdateMemberDto {
    @ApiProperty({ required: false, enum: ['ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'] }) @IsOptional() @IsIn(['ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER']) role?: MemberRole;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() can_copy?: boolean;
    @ApiProperty({ required: false }) @IsOptional() @IsBoolean() can_reshare?: boolean;
}

export class CreateShareDto {
    @ApiProperty({ enum: ShareResourceType }) @IsEnum(ShareResourceType) resource_type: ShareResourceType;
    @ApiProperty({ required: false, description: 'Resource id (defaults to the project for PROJECT/STUDY_PLAN)' }) @IsOptional() @IsUUID() resource_id?: string;
    @ApiProperty({ enum: ShareTargetType }) @IsEnum(ShareTargetType) target_type: ShareTargetType;
    @ApiProperty({ required: false }) @IsOptional() @Transform(lower) @IsEmail() email?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() organization_id?: string;
    @ApiProperty({ enum: SharePermission, default: SharePermission.VIEW }) @IsOptional() @IsEnum(SharePermission) permission?: SharePermission;
    @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() can_copy?: boolean;
    @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() can_reshare?: boolean;
    @ApiProperty({ required: false, description: 'Link expiry in days' }) @IsOptional() @IsInt() @Min(1) @Max(365) expires_in_days?: number;
}

export class CopySharedDto {
    @ApiProperty({ required: false, description: 'Destination project (required for decks, quizzes, notes)' }) @IsOptional() @IsUUID() target_project_id?: string;
}

export class CreateOrganizationDto {
    @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name: string;
}

export class AddOrgMemberDto {
    @ApiProperty() @Transform(lower) @IsEmail() email: string;
    @ApiProperty({ enum: OrgRole, required: false }) @IsOptional() @IsEnum(OrgRole) role?: OrgRole;
}
