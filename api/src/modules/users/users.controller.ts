import { Body, Controller, Delete, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { DeleteAccountDto, UpdatePreferencesDto, UpdateProfileDto } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly users: UsersService) { }

    @Patch('me')
    @ApiOperation({ summary: 'Update profile' })
    update(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
        return this.users.updateProfile(userId, dto);
    }

    @Get('me/preferences')
    preferences(@CurrentUser('id') userId: string) {
        return this.users.getPreferences(userId);
    }

    @Patch('me/preferences')
    @ApiOperation({ summary: 'Update sound/animation/focus/notification preferences (synced across devices)' })
    updatePreferences(@CurrentUser('id') userId: string, @Body() dto: UpdatePreferencesDto) {
        return this.users.updatePreferences(userId, dto);
    }

    @Get('lookup')
    @ApiOperation({ summary: 'Find a user by exact email (for invitations)' })
    lookup(@Query('email') email: string) {
        return this.users.searchByEmail(email ?? '');
    }

    @Delete('me')
    @ApiOperation({ summary: 'Permanently delete account and owned data' })
    remove(@CurrentUser('id') userId: string, @Body() dto: DeleteAccountDto) {
        return this.users.deleteAccount(userId, dto.confirm);
    }
}
