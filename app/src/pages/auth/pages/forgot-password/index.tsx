import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/features/auth/hooks/use-auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../../validation-schemas/auth";
import { AuthHeading } from "../../components/auth-heading";

export default function ForgotPasswordPage() {
    usePageMetadata({ title: "Forgot password" });
    const forgot = useForgotPassword();
    const form = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

    if (forgot.isSuccess) {
        return (
            <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <MailCheck className="h-7 w-7" aria-hidden />
                </div>
                <AuthHeading title="Check your inbox" description={forgot.data.message} />
                <Button asChild variant="outline" className="w-full">
                    <Link to={Routes.auth.sign_in}>Back to sign in</Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            <AuthHeading title="Reset your password" description="Enter your email and we'll send you a secure link to choose a new password." />
            <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => forgot.mutate(v.email))} className="space-y-4" noValidate>
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
                    <Button type="submit" className="h-10 w-full" loading={forgot.isPending}>
                        Send reset link
                    </Button>
                </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to={Routes.auth.sign_in} className="font-medium text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </>
    );
}
