import { useEffect, useRef } from "react";
import { environments } from "@/config/environments";
import { useGoogleSignin } from "@/features/auth/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { currentLanguage } from "@/i18n";

interface GoogleAccounts {
    id: {
        initialize: (cfg: { client_id: string; callback: (res: { credential: string }) => void }) => void;
        renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
}

declare global {
    interface Window {
        google?: { accounts: GoogleAccounts };
    }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

/** Google Identity Services button. Renders nothing unless VITE_GOOGLE_CLIENT_ID is configured. */
export const GoogleSignInButton = () => {
    const { t } = useTranslation("auth");
    const ref = useRef<HTMLDivElement>(null);
    const google = useGoogleSignin();
    const clientId = environments.GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!clientId || !ref.current) return;
        const render = () => {
            if (!window.google || !ref.current) return;
            window.google.accounts.id.initialize({ client_id: clientId, callback: (res) => google.mutate(res.credential) });
            window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", width: 360, text: "continue_with", shape: "rectangular", locale: currentLanguage() });
        };
        if (window.google) {
            render();
            return;
        }
        let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
        script.addEventListener("load", render);
        return () => script?.removeEventListener("load", render);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    if (!clientId) return null;
    return (
        <>
            <div className="relative my-5 text-center text-xs text-muted-foreground">
                <span className="relative z-10 bg-background px-2">{t("google.or")}</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
            </div>
            <div ref={ref} className="flex justify-center" />
        </>
    );
};
