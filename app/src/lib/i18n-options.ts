import i18n from "@/i18n";

/**
 * Builds a dropdown/label option whose `label` (and optional `description`) are translation getters.
 * Getters are evaluated at render time, so option arrays defined at module level stay in sync with
 * the active language (components re-render on language change via `useTranslation`).
 *
 * @example
 * export const ProjectStatusFormOptions = [tOption("NOT_STARTED", "projects:status.NOT_STARTED")];
 */
export const tOption = <T extends string>(id: T, labelKey: string, descriptionKey?: string) => {
    const option = {
        id,
        get label(): string {
            return i18n.t(labelKey);
        },
    };
    // defineProperty (not object spread) keeps `description` a live getter.
    if (descriptionKey) {
        Object.defineProperty(option, "description", { enumerable: true, get: () => i18n.t(descriptionKey) });
    }
    return option as typeof option & { description?: string };
};

/** Translate a key outside React components (services, hooks, toasts, option getters). */
export const tr = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options) as string;
