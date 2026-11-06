import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

/**
 * Internationalisation (react-i18next).
 *
 * - Every `locales/<lng>/<namespace>.json` file is discovered automatically (no registration needed):
 *   add a JSON file with the same name for every supported language.
 * - Default namespace is `common`; reference other namespaces as `t("ns:key")` or `useTranslation("ns")`.
 * - Plurals use i18next suffixes (`key_one`, `key_other`) with a `count` option.
 * - Run `npm run i18n:check` to verify that all languages have identical keys.
 */

export const SupportedLanguages = {
    EN: "en",
    EL: "el",
} as const;
export type SupportedLanguage = (typeof SupportedLanguages)[keyof typeof SupportedLanguages];

export const LANGUAGE_STORAGE_KEY = "quizme-language";

/** BCP-47 locale used for Intl/date formatting per UI language. */
export const LanguageLocales: Record<SupportedLanguage, string> = {
    en: "en-GB",
    el: "el-GR",
};

type Resources = Record<string, Record<string, Record<string, unknown>>>;

const modules = import.meta.glob<{ default: Record<string, unknown> }>("./locales/*/*.json", { eager: true });

const resources: Resources = {};
for (const [path, mod] of Object.entries(modules)) {
    const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (!match) continue;
    const [, lng, ns] = match;
    resources[lng] ??= {};
    resources[lng][ns] = mod.default;
}

export const namespaces = Object.keys(resources.en ?? {});

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: Object.values(SupportedLanguages),
        fallbackLng: SupportedLanguages.EN,
        nonExplicitSupportedLngs: true,
        load: "languageOnly",
        ns: namespaces,
        defaultNS: "common",
        fallbackNS: "common",
        interpolation: { escapeValue: false },
        returnNull: false,
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
            caches: ["localStorage"],
        },
        react: { useSuspense: false },
    });

const applyDocumentLanguage = (lng: string) => {
    if (typeof document !== "undefined") document.documentElement.lang = currentLanguage(lng);
};

/** Normalised current UI language ("en" | "el"). */
export const currentLanguage = (lng: string = i18n.resolvedLanguage || i18n.language || "en"): SupportedLanguage =>
    lng.toLowerCase().startsWith("el") ? SupportedLanguages.EL : SupportedLanguages.EN;

/** Intl locale for the current UI language. */
export const currentLocale = (): string => LanguageLocales[currentLanguage()];

export const changeLanguage = (lng: SupportedLanguage) => i18n.changeLanguage(lng);

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
