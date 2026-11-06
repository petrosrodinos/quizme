import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
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
    usePageMetadata({ title: "Create account" });
    const signUp = useSignup();
    const [params] = useSearchParams();
    const form = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { full_name: "", email: "", password: "", confirm_password: "" },
    });

    return (
        <>
            <AuthHeading title="Create your account" description="Start building your personal learning system in minutes." />
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
                                <FormLabel>Full name</FormLabel>
                                <FormControl>
                                    <Input autoComplete="name" placeholder="Ada Lovelace" className="h-10" {...field} />
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
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" autoComplete="email" placeholder="you@example.com" className="h-10" {...field} />
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
                                <FormLabel>Password</FormLabel>
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
                                <FormLabel>Confirm password</FormLabel>
                                <FormControl>
                                    <PasswordInput autoComplete="new-password" placeholder="Repeat password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="h-10 w-full" loading={signUp.isPending}>
                        Create account
                    </Button>
                </form>
            </Form>
            <GoogleSignInButton />
            <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to={`${Routes.auth.sign_in}${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-medium text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </>
    );
}
