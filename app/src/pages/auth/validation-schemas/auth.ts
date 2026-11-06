import { z } from "zod";

const email = z.string().trim().min(1, "Please enter your email").email("Please enter a valid email");
const newPassword = z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long");

export const signInSchema = z.object({
    email,
    password: z.string().min(1, "Please enter your password"),
});

export const signUpSchema = z
    .object({
        full_name: z.string().trim().max(120).optional(),
        email,
        password: newPassword,
        confirm_password: z.string(),
    })
    .refine((d) => d.password === d.confirm_password, { message: "Passwords don't match", path: ["confirm_password"] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
    .object({ password: newPassword, confirm_password: z.string() })
    .refine((d) => d.password === d.confirm_password, { message: "Passwords don't match", path: ["confirm_password"] });

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
