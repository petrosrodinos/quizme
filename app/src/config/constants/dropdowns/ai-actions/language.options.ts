import { tOption } from "@/lib/i18n-options";

/**
 * Translation target languages. `id` is the English language name sent to the AI; `label` is shown in the UI language.
 */
const lang = (id: string, key: string) => tOption(id, `reader:languages.${key}`);

export const LanguageOptions: { id: string; label: string }[] = [
    lang("English", "english"),
    lang("Spanish", "spanish"),
    lang("French", "french"),
    lang("German", "german"),
    lang("Italian", "italian"),
    lang("Portuguese", "portuguese"),
    lang("Greek", "greek"),
    lang("Dutch", "dutch"),
    lang("Polish", "polish"),
    lang("Turkish", "turkish"),
    lang("Arabic", "arabic"),
    lang("Chinese (Simplified)", "chineseSimplified"),
    lang("Japanese", "japanese"),
    lang("Korean", "korean"),
    lang("Hindi", "hindi"),
    lang("Russian", "russian"),
    lang("Ukrainian", "ukrainian"),
];
