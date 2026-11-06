import { z } from "zod";
import i18n from "./index";

/**
 * Localised default messages for zod (zod ships no Greek locale). Custom messages declared in schemas
 * still take precedence; this only covers rules without an explicit message. Messages are produced at
 * validation time, so they always follow the active language.
 */
const v = (key: string, options?: Record<string, unknown>) => i18n.t(`common:validation.${key}`, options) as string;

z.config({
    localeError: (issue) => {
        switch (issue.code) {
            case "invalid_type":
                return issue.input === undefined || issue.input === null || issue.input === "" ? v("required") : v("invalid");
            case "too_small": {
                const min = Number(issue.minimum);
                if (issue.origin === "string") return min <= 1 ? v("required") : v("minLength", { count: min });
                if (issue.origin === "array" || issue.origin === "set") return v("minItems", { count: min });
                return v("min", { min });
            }
            case "too_big": {
                const max = Number(issue.maximum);
                if (issue.origin === "string") return v("maxLength", { count: max });
                if (issue.origin === "array" || issue.origin === "set") return v("maxItems", { count: max });
                return v("max", { max });
            }
            case "invalid_format":
                if (issue.format === "email") return v("email");
                if (issue.format === "url") return v("url");
                return v("invalid");
            case "invalid_value":
                return v("invalid");
            default:
                return v("invalid");
        }
    },
});
