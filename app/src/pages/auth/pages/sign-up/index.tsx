import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useSignup } from "@/features/auth/hooks/use-auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { signUpSchema, type SignUpFormValues } from "../../validation-schemas/auth";
import { AuthHeading } from "../../components/auth-heading";
import { GoogleSignInButton } from "../../components/google-sign-in-button";

export default function SignUpPage() {
    const { t } = useTranslation("auth");
    usePageMetadata({ title: t("signUp.pageTitle") });
    const signUp = useSignup();
    const [params] = useSearchParams();
    const form = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { full_name: "", email: "", password: "", confirm_password: "" },
    });

    return (
        <>
            <AuthHeading title={t("signUp.title")} description={t("signUp.description")} />
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit((v) => signUp.mutate({ email: v.email, password: v.password, full_name: v.full_name || undefined }))}
                    className="space-y-4"
                    noValidate
                >
                    <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("fields.fullName")}</FormLabel>
                                <FormControl>
                                    <Input autoComplete="name" placeholder={t("fields.fullNamePlaceholder")} className="h-10" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("fields.email")}</FormLabel>
                                <FormControl>
                                    <Input type="email" autoComplete="email" placeholder={t("fields.emailPlaceholder")} className="h-10" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("fields.password")}</FormLabel>
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
                                <FormLabel>{t("fields.confirmPassword")}</FormLabel>
                                <FormControl>
                                    <PasswordInput autoComplete="new-password" placeholder={t("fields.repeatPassword")} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="h-10 w-full" loading={signUp.isPending}>
                        {t("signUp.submit")}
                    </Button>
                </form>
            </Form>
            <GoogleSignInButton />
            <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("signUp.haveAccount")}{" "}
                <Link to={`${Routes.auth.sign_in}${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-medium text-primary hover:underline">
                    {t("signUp.signIn")}
                </Link>
            </p>
        </>
    );
}
