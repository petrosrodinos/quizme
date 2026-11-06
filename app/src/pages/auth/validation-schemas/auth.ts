import { z } from "zod";
import { tr } from "@/lib/i18n-options";

// Messages are functions so they are resolved in the active language at validation time.
const email = z
    .string()
    .trim()
    .min(1, { error: () => tr("auth:validation.emailRequired") })
    .email({ error: () => tr("auth:validation.emailInvalid") });
const newPassword = z
    .string()
    .min(8, { error: () => tr("auth:validation.passwordMin", { count: 8 }) })
    .max(128, { error: () => tr("auth:validation.passwordMax") });

export const signInSchema = z.object({
    email,
    password: z.string().min(1, { error: () => tr("auth:validation.passwordRequired") }),
});

export const signUpSchema = z
    .object({
        full_name: z.string().trim().max(120).optional(),
        email,
        password: newPassword,
        confirm_password: z.string(),
    })
    .refine((d) => d.password === d.confirm_password, { error: () => tr("common:validation.passwordsMatch"), path: ["confirm_password"] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
    .object({ password: newPassword, confirm_password: z.string() })
    .refine((d) => d.password === d.confirm_password, { error: () => tr("common:validation.passwordsMatch"), path: ["confirm_password"] });

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
