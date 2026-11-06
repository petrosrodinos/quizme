import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const profileSchema = z.object({
    full_name: z
        .string()
        .trim()
        .max(120, { error: () => tr("settings:validation.nameTooLong") }),
    timezone: z.string().min(1, { error: () => tr("settings:validation.timezoneRequired") }),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, { error: () => tr("settings:validation.currentPasswordRequired") }),
        new_password: z
            .string()
            .min(8, { error: () => tr("auth:validation.passwordMin", { count: 8 }) })
            .max(128, { error: () => tr("auth:validation.passwordMax") }),
        confirm_password: z.string(),
    })
    .refine((v) => v.new_password === v.confirm_password, { error: () => tr("common:validation.passwordsMatch"), path: ["confirm_password"] });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
