import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useResetPassword } from "@/features/auth/hooks/use-auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { resetPasswordSchema, type ResetPasswordFormValues } from "../../validation-schemas/auth";
import { AuthHeading } from "../../components/auth-heading";

export default function ResetPasswordPage() {
    usePageMetadata({ title: "Choose a new password" });
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const reset = useResetPassword();
    const form = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm_password: "" } });

    if (!token) {
        return (
            <>
                <AuthHeading title="Invalid reset link" description="This password reset link is missing or malformed." />
                <Button asChild className="w-full">
                    <Link to={Routes.auth.forgot_password}>Request a new link</Link>
                </Button>
            </>
        );
    }

    return (
        <>
            <AuthHeading title="Choose a new password" description="For your security, all other sessions will be signed out." />
            {reset.isError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                        {reset.error.message}{" "}
                        <Link to={Routes.auth.forgot_password} className="underline">
                            Request a new link
                        </Link>
                    </AlertDescription>
                </Alert>
            )}
            <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => reset.mutate({ token, password: v.password }))} className="space-y-4" noValidate>
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New password</FormLabel>
                                <FormControl>
                                    <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirm_password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm new password</FormLabel>
                                <FormControl>
                                    <PasswordInput autoComplete="new-password" placeholder="Repeat password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="h-10 w-full" loading={reset.isPending}>
                        Update password
                    </Button>
                </form>
            </Form>
        </>
    );
}
