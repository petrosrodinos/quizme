import { CONTENT_LANGUAGES, contentLanguageName, isContentLanguage, resolveContentLanguage } from './languages';

describe('content languages', () => {
    it('ships English and Greek', () => {
        expect(CONTENT_LANGUAGES.map((l) => l.code)).toEqual(expect.arrayContaining(['en', 'el']));
    });
    it('resolves regional codes and falls back to English', () => {
        expect(resolveContentLanguage('el-GR')).toBe('el');
        expect(resolveContentLanguage('xx')).toBe('en');
        expect(resolveContentLanguage(null)).toBe('en');
    });
    it('validates codes', () => {
        expect(isContentLanguage('el')).toBe(true);
        expect(isContentLanguage('fr')).toBe(false);
    });
    it('names languages for prompts', () => {
        expect(contentLanguageName('el')).toContain('Greek');
        expect(contentLanguageName('en')).toBe('English');
    });
});
