import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { useResendVerification } from "@/features/auth/hooks/use-auth";

export const EmailVerificationBanner = () => {
    const { t } = useTranslation("layout");
    const user = useAuthStore((s) => s.user);
    const resend = useResendVerification();
    const [dismissed, setDismissed] = useState(false);
    if (!user || user.email_verified || dismissed) return null;
    return (
        <div className="flex items-center gap-3 border-b border-amber/30 bg-amber/10 px-4 py-2 text-sm" role="status">
            <MailWarning className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber" aria-hidden />
            <span className="flex-1">{t("verifyBanner.message", { email: user.email })}</span>
            <Button size="sm" variant="outline" onClick={() => resend.mutate()} loading={resend.isPending}>
                {t("verifyBanner.resend")}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("verifyBanner.dismiss")} onClick={() => setDismissed(true)}>
                <X />
            </Button>
        </div>
    );
};
