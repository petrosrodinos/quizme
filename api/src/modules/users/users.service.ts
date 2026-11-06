import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StorageService } from '@/core/storage/storage.service';
import { AuditActions, AuditService } from '@/shared/audit/audit.service';
import { safeZone } from '@/shared/utils/date.utils';
import { publicUser } from '../auth/auth.service';
import { UpdatePreferencesDto, UpdateProfileDto } from './dto/users.dto';
import { I18nService } from '@/shared/i18n/i18n.service';

export const DEFAULT_NOTIFICATION_PREFS = {
    study_reminders: true,
    flashcards_due: true,
    invitations: true,
    collaboration: true,
    quiz_completion: true,
    goals: true,
    exams: true,
    streak_risk: true,
    achievements: true,
    email: false,
};

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly audit: AuditService,
        private readonly i18n: I18nService,
    ) { }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                full_name: dto.full_name !== undefined ? dto.full_name.trim() || null : undefined,
                timezone: dto.timezone ? safeZone(dto.timezone) : undefined,
            },
        });
        return publicUser(user);
    }

    async getPreferences(userId: string) {
        const prefs = await this.prisma.userPreferences.upsert({ where: { user_id: userId }, create: { user_id: userId }, update: {} });
        return { ...prefs, notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...((prefs.notification_prefs as object) ?? {}) } };
    }

    async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
        const current = await this.getPreferences(userId);
        const { notification_prefs, ...rest } = dto;
        const merged = notification_prefs
            ? Object.fromEntries(
                Object.entries({ ...current.notification_prefs, ...notification_prefs }).filter(([k, v]) => k in DEFAULT_NOTIFICATION_PREFS && typeof v === 'boolean'),
            )
            : undefined;
        await this.prisma.userPreferences.update({
            where: { user_id: userId },
            data: { ...rest, ...(merged ? { notification_prefs: merged as Prisma.InputJsonValue } : {}) },
        });
        if (dto.language) this.i18n.forget(userId);
        return this.getPreferences(userId);
    }

    async searchByEmail(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        return user ? { id: user.id, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url } : null;
    }

    /** Hard-deletes the account and everything owned by it (cascades), plus stored files. */
    async deleteAccount(userId: string, confirm: string) {
        if (confirm !== 'DELETE') throw new BadRequestException('Type DELETE to confirm');
        const docs = await this.prisma.studyDocument.findMany({ where: { project: { owner_id: userId } }, select: { storage_key: true } });
        await this.prisma.user.delete({ where: { id: userId } });
        setImmediate(async () => {
            for (const d of docs) await this.storage.delete(d.storage_key);
        });
        this.audit.log({ userId: null, action: AuditActions.ACCOUNT_DELETED, resourceId: userId });
        return { success: true };
    }
}
