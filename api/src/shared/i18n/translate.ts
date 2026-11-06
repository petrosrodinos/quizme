import { Lang, MESSAGES } from './messages';

export type Params = Record<string, string | number | null | undefined>;
/** A translatable message: either literal text or a catalogue key with parameters. */
export type Msg = string | { key: string; params?: Params };

export const msg = (key: string, params?: Params): Msg => ({ key, params });

export const normalizeLang = (value?: string | null): Lang => (value?.toLowerCase().startsWith('el') ? 'el' : 'en');

/** Translate a catalogue key (supports `{{param}}` interpolation and `_one`/`_other` plurals via `count`). */
export const translate = (lang: Lang, key: string, params: Params = {}): string => {
    const dict = MESSAGES[lang] ?? MESSAGES.en;
    let template: string | undefined;
    if (typeof params.count === 'number') {
        const suffix = params.count === 1 ? '_one' : '_other';
        template = dict[`${key}${suffix}`] ?? MESSAGES.en[`${key}${suffix}`];
    }
    template ??= dict[key] ?? MESSAGES.en[key] ?? key;
    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
        const v = params[name];
        if (v === undefined || v === null) return '';
        // "@:other.key" params are themselves translated (e.g. a role name inside a sentence).
        return typeof v === 'string' && v.startsWith('@:') ? translate(lang, v.slice(2)) : String(v);
    });
};
