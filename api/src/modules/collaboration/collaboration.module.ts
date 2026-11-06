import { Body, Controller, Delete, Get, Global, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CollaborationService } from './collaboration.service';
import { AddOrgMemberDto, CopySharedDto, CreateOrganizationDto, CreateShareDto, InviteMemberDto, UpdateMemberDto } from './dto/collaboration.dto';

@ApiTags('Collaboration')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class CollaborationController {
    constructor(private readonly collab: CollaborationService) { }

    // Members & invitations
    @Get('projects/:projectId/members')
    members(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.collab.members(userId, projectId);
    }

    @Post('projects/:projectId/invitations')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiOperation({ summary: 'Invite someone by email with a role' })
    invite(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: InviteMemberDto, @Req() req: Request) {
        return this.collab.invite(userId, projectId, dto, req.ip);
    }

    @Delete('projects/:projectId/invitations/:invitationId')
    revokeInvitation(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('invitationId', ParseUUIDPipe) invitationId: string) {
        return this.collab.revokeInvitation(userId, projectId, invitationId);
    }

    @Patch('projects/:projectId/members/:userId')
    updateMember(
        @CurrentUser('id') userId: string,
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Param('userId', ParseUUIDPipe) memberId: string,
        @Body() dto: UpdateMemberDto,
        @Req() req: Request,
    ) {
        return this.collab.updateMember(userId, projectId, memberId, dto, req.ip);
    }

    @Delete('projects/:projectId/members/:userId')
    @ApiOperation({ summary: 'Revoke a member (or leave when removing yourself)' })
    removeMember(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('userId', ParseUUIDPipe) memberId: string, @Req() req: Request) {
        return this.collab.removeMember(userId, projectId, memberId, req.ip);
    }

    @Get('invitations')
    myInvitations(@CurrentUser('id') userId: string) {
        return this.collab.myInvitations(userId);
    }

    @Get('invitations/token/:token')
    preview(@CurrentUser('id') userId: string, @Param('token') token: string) {
        return this.collab.previewInvitation(userId, token);
    }

    @Post('invitations/token/:token/accept')
    @HttpCode(200)
    acceptByToken(@CurrentUser('id') userId: string, @Param('token') token: string) {
        return this.collab.acceptInvitation(userId, { token });
    }

    @Post('invitations/:id/accept')
    @HttpCode(200)
    accept(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.collab.acceptInvitation(userId, { id });
    }

    @Post('invitations/:id/decline')
    @HttpCode(200)
    decline(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.collab.declineInvitation(userId, id);
    }

    // Shares
    @Post('projects/:projectId/shares')
    @ApiOperation({ summary: 'Share a project, document, deck, quiz, note or study plan (user, link or organization)' })
    share(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateShareDto, @Req() req: Request) {
        return this.collab.createShare(userId, projectId, dto, req.ip);
    }

    @Get('projects/:projectId/shares')
    shares(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.collab.listShares(userId, projectId);
    }

    @Delete('shares/:id')
    revokeShare(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        return this.collab.revokeShare(userId, id, req.ip);
    }

    @Get('shared-with-me')
    sharedWithMe(@CurrentUser('id') userId: string) {
        return this.collab.sharedWithMe(userId);
    }

    @Get('shared/link/:token')
    viewLink(@CurrentUser('id') userId: string, @Param('token') token: string) {
        return this.collab.viewShared(userId, { token });
    }

    @Post('shared/link/:token/join')
    @HttpCode(200)
    join(@CurrentUser('id') userId: string, @Param('token') token: string) {
        return this.collab.joinViaLink(userId, token);
    }

    @Post('shared/link/:token/copy')
    copyLink(@CurrentUser('id') userId: string, @Param('token') token: string, @Body() dto: CopySharedDto) {
        return this.collab.copyShared(userId, { token }, dto);
    }

    @Get('shared/:id')
    view(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.collab.viewShared(userId, { id });
    }

    @Post('shared/:id/copy')
    copy(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CopySharedDto) {
        return this.collab.copyShared(userId, { id }, dto);
    }

    // Organizations / groups
    @Post('organizations')
    createOrg(@CurrentUser('id') userId: string, @Body() dto: CreateOrganizationDto) {
        return this.collab.createOrganization(userId, dto);
    }

    @Get('organizations')
    orgs(@CurrentUser('id') userId: string) {
        return this.collab.myOrganizations(userId);
    }

    @Get('organizations/:id/members')
    orgMembers(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.collab.orgMembers(userId, id);
    }

    @Post('organizations/:id/members')
    addOrgMember(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddOrgMemberDto) {
        return this.collab.addOrgMember(userId, id, dto);
    }

    @Delete('organizations/:id/members/:userId')
    removeOrgMember(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) memberId: string) {
        return this.collab.removeOrgMember(userId, id, memberId);
    }
}

@Global()
@Module({ controllers: [CollaborationController], providers: [CollaborationService], exports: [CollaborationService] })
export class CollaborationModule { }
