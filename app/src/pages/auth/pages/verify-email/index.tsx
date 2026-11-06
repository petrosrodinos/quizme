import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/features/auth/hooks/use-auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { AuthHeading } from "../../components/auth-heading";

/** Auto-submits the token from the email link once. Works whether or not the user is signed in. */
export default function VerifyEmailPage() {
    const { t } = useTranslation("auth");
    usePageMetadata({ title: t("verify.pageTitle") });
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const verify = useVerifyEmail(token);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

    const next = isLoggedIn ? Routes.dashboard : Routes.auth.sign_in;

    if (!token || verify.isError) {
        return (
            <div className="text-center">
                <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden />
                <AuthHeading title={t("verify.failedTitle")} description={verify.error?.message ?? t("verify.invalidLink")} />
                <Button asChild className="w-full">
                    <Link to={next}>{isLoggedIn ? t("common:actions.goToDashboard") : t("signUp.signIn")}</Link>
                </Button>
            </div>
        );
    }

    if (verify.isSuccess) {
        return (
            <div className="text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" aria-hidden />
                <AuthHeading title={t("verify.successTitle")} description={t("verify.successDescription")} />
                <Button asChild className="w-full">
                    <Link to={next}>{isLoggedIn ? t("verify.continue") : t("signUp.signIn")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="text-center" aria-busy="true">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" aria-hidden />
            <AuthHeading title={t("verify.pendingTitle")} description={t("verify.pendingDescription")} />
        </div>
    );
}
