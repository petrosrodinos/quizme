import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/features/auth/hooks/use-auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { AuthHeading } from "../../components/auth-heading";

/** Auto-submits the token from the email link once. Works whether or not the user is signed in. */
export default function VerifyEmailPage() {
    usePageMetadata({ title: "Verify email" });
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const verify = useVerifyEmail(token);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

    const next = isLoggedIn ? Routes.dashboard : Routes.auth.sign_in;

    if (!token || verify.isError) {
        return (
            <div className="text-center">
                <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden />
                <AuthHeading title="Verification failed" description={verify.error?.message ?? "This verification link is missing or invalid."} />
                <Button asChild className="w-full">
                    <Link to={next}>{isLoggedIn ? "Go to dashboard" : "Sign in"}</Link>
                </Button>
            </div>
        );
    }

    if (verify.isSuccess) {
        return (
            <div className="text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" aria-hidden />
                <AuthHeading title="Email verified" description="Thanks for confirming your email address." />
                <Button asChild className="w-full">
                    <Link to={next}>{isLoggedIn ? "Continue to dashboard" : "Sign in"}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="text-center" aria-busy="true">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" aria-hidden />
            <AuthHeading title="Verifying your email" description="This only takes a moment." />
        </div>
    );
}
