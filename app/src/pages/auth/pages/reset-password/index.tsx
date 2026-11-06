import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation("auth");
    usePageMetadata({ title: t("reset.title") });
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const reset = useResetPassword();
    const form = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm_password: "" } });

    if (!token) {
        return (
            <>
                <AuthHeading title={t("reset.invalidTitle")} description={t("reset.invalidDescription")} />
                <Button asChild className="w-full">
                    <Link to={Routes.auth.forgot_password}>{t("reset.requestNew")}</Link>
                </Button>
            </>
        );
    }

    return (
        <>
            <AuthHeading title={t("reset.title")} description={t("reset.description")} />
            {reset.isError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                        {reset.error.message}{" "}
                        <Link to={Routes.auth.forgot_password} className="underline">
                            {t("reset.requestNew")}
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
                                <FormLabel>{t("fields.newPassword")}</FormLabel>
                                <FormControl>
                                    <PasswordInput autoComplete="new-password" placeholder={t("fields.passwordPlaceholder", { count: 8 })} {...field} />
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
                                <FormLabel>{t("fields.confirmNewPassword")}</FormLabel>
                                <FormControl>
                                    <PasswordInput autoComplete="new-password" placeholder={t("fields.repeatPassword")} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="h-10 w-full" loading={reset.isPending}>
                        {t("reset.submit")}
                    </Button>
                </form>
            </Form>
        </>
    );
}
