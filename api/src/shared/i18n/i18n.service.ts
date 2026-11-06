import { Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { Lang } from './messages';
import { ContentLanguageCode, resolveContentLanguage } from './languages';
import { Msg, normalizeLang, Params, translate } from './translate';

export { msg, normalizeLang, translate } from './translate';
export type { Msg, Params } from './translate';

const LOCALES: Record<Lang, string> = { en: 'en-GB', el: 'el-GR' };

/** Server-side localisation: resolves a user's language preference and renders catalogue messages. */
@Injectable()
export class I18nService {
    private readonly cache = new Map<string, { lang: Lang; at: number }>();

    constructor(private readonly prisma: PrismaService) { }

    async languageOf(userId: string | null | undefined): Promise<Lang> {
        if (!userId) return 'en';
        const hit = this.cache.get(userId);
        if (hit && Date.now() - hit.at < 60_000) return hit.lang;
        const prefs = await this.prisma.userPreferences.findUnique({ where: { user_id: userId }, select: { language: true } });
        const lang = normalizeLang(prefs?.language);
        this.cache.set(userId, { lang, at: Date.now() });
        if (this.cache.size > 20_000) this.cache.clear();
        return lang;
    }

    private readonly projectCache = new Map<string, { code: ContentLanguageCode; at: number }>();

    /**
     * Content language of a project (drives generated content + AI tutor replies). Falls back to the user's
     * interface language when there is no project (e.g. global search / dashboard calls).
     */
    async contentLanguageOf(projectId: string | null | undefined, fallbackUserId?: string | null): Promise<ContentLanguageCode> {
        if (!projectId) return resolveContentLanguage(await this.languageOf(fallbackUserId));
        const hit = this.projectCache.get(projectId);
        if (hit && Date.now() - hit.at < 60_000) return hit.code;
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { language: true } });
        const code = project ? resolveContentLanguage(project.language) : resolveContentLanguage(await this.languageOf(fallbackUserId));
        this.projectCache.set(projectId, { code, at: Date.now() });
        if (this.projectCache.size > 20_000) this.projectCache.clear();
        return code;
    }

    /** Invalidate after a project's language changes. */
    forgetProject(projectId: string) {
        this.projectCache.delete(projectId);
    }

    /** Invalidate after the user changes language. */
    forget(userId: string) {
        this.cache.delete(userId);
    }

    t(lang: Lang, key: string, params?: Params) {
        return translate(lang, key, params);
    }

    render(lang: Lang, m: Msg | undefined | null): string | undefined {
        if (m === undefined || m === null) return undefined;
        return typeof m === 'string' ? m : translate(lang, m.key, m.params);
    }

    async forUser(userId: string) {
        const lang = await this.languageOf(userId);
        return { lang, t: (key: string, params?: Params) => translate(lang, key, params) };
    }

    formatDate(lang: Lang, date: Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
        return new Intl.DateTimeFormat(LOCALES[lang], options).format(date);
    }
}

@Global()
@Module({ providers: [I18nService], exports: [I18nService] })
export class ServerI18nModule { }
