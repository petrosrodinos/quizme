/**
 * Content-language registry — the single source of truth for the languages a study project can be created in.
 *
 * A project's language drives the language of everything generated for it (questions, flashcards, summaries,
 * topics, notes) and of the AI tutor / feedback. It is independent of the interface language: UI strings need
 * catalogue translations (see `messages.ts`), whereas content only needs an LLM-readable name here.
 *
 * To add a language: add one entry below (and, optionally, UI translations in `messages.ts` + the app locales).
 * The API validation, the AI prompts and the web app's selector (via GET /projects/languages) pick it up.
 */
export interface ContentLanguage {
    /** BCP-47-ish short code stored on the project (`projects.language`). */
    code: string;
    /** English name — used in prompts. */
    name: string;
    /** Name in the language itself — shown in selectors. */
    nativeName: string;
}

export const CONTENT_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
] as const satisfies readonly ContentLanguage[];

export type ContentLanguageCode = (typeof CONTENT_LANGUAGES)[number]['code'];

export const DEFAULT_CONTENT_LANGUAGE: ContentLanguageCode = 'en';
export const CONTENT_LANGUAGE_CODES: string[] = CONTENT_LANGUAGES.map((l) => l.code);

export const isContentLanguage = (code?: string | null): code is ContentLanguageCode => !!code && CONTENT_LANGUAGE_CODES.includes(code);

/** Resolves any value to a supported code, falling back to the default. */
export const resolveContentLanguage = (code?: string | null): ContentLanguageCode => {
    const short = code?.toLowerCase().split('-')[0];
    return isContentLanguage(short) ? short : DEFAULT_CONTENT_LANGUAGE;
};

export const contentLanguageName = (code?: string | null): string => {
    const lang = CONTENT_LANGUAGES.find((l) => l.code === resolveContentLanguage(code));
    return lang && lang.code !== 'en' ? `${lang.name} (${lang.nativeName})` : (lang?.name ?? 'English');
};
