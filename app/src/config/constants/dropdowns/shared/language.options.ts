import { SupportedLanguages, type SupportedLanguage } from "@/i18n";

/** UI languages. Native names are intentionally not translated (users recognise their own language). */
export const LanguageOptions: { id: SupportedLanguage; nativeName: string; englishName: string }[] = [
    { id: SupportedLanguages.EN, nativeName: "English", englishName: "English" },
    { id: SupportedLanguages.EL, nativeName: "Ελληνικά", englishName: "Greek" },
];
