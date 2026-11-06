import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useSignin } from "@/features/auth/hooks/use-auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { signInSchema, type SignInFormValues } from "../../validation-schemas/auth";
import { AuthHeading } from "../../components/auth-heading";
import { GoogleSignInButton } from "../../components/google-sign-in-button";

export default function SignInPage() {
    const { t } = useTranslation("auth");
    usePageMetadata({ title: t("signIn.pageTitle") });
    const signIn = useSignin();
    const [params] = useSearchParams();
    const form = useForm<SignInFormValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });

    return (
        <>
            <AuthHeading title={t("signIn.title")} description={t("signIn.description")} />
            <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => signIn.mutate(v))} className="space-y-4" noValidate>
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
                                <div className="flex items-center justify-between">
                                    <FormLabel>{t("fields.password")}</FormLabel>
                                    <Link to={Routes.auth.forgot_password} className="text-xs text-primary hover:underline">
                                        {t("signIn.forgotPassword")}
                                    </Link>
                                </div>
                                <FormControl>
                                    <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="h-10 w-full" loading={signIn.isPending}>
                        {t("signIn.submit")}
                    </Button>
                </form>
            </Form>
            <GoogleSignInButton />
            <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("signIn.newHere")}{" "}
                <Link to={`${Routes.auth.sign_up}${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-medium text-primary hover:underline">
                    {t("signIn.createAccount")}
                </Link>
            </p>
        </>
    );
}
