import { z } from "zod";

export const profileSchema = z.object({
    full_name: z.string().trim().max(120, "Name is too long"),
    timezone: z.string().min(1, "Choose a timezone"),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, "Enter your current password"),
        new_password: z.string().min(8, "Use at least 8 characters").max(128),
        confirm_password: z.string(),
    })
    .refine((v) => v.new_password === v.confirm_password, { message: "Passwords don't match", path: ["confirm_password"] });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
