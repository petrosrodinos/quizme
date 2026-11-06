import { Link, Outlet } from "react-router-dom";
import { BrainCircuit, Layers, LineChart, Sparkles } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { environments } from "@/config/environments";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { useSyncLanguageChoice } from "@/features/preferences/hooks/use-preferences";
import { Routes } from "@/routes/routes";

const highlights = [
    { icon: Sparkles, key: "layout.highlights.materials" },
    { icon: BrainCircuit, key: "layout.highlights.tutor" },
    { icon: Layers, key: "layout.highlights.adaptive" },
    { icon: LineChart, key: "layout.highlights.readiness" },
] as const;

/** Editorial split layout for all /auth pages. */
export default function AuthLayout() {
    const { t } = useTranslation("auth");
    const syncLanguage = useSyncLanguageChoice();
    return (
        <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
            <aside className="relative hidden overflow-hidden bg-[#181715] p-12 text-[#faf9f5] lg:flex lg:flex-col lg:justify-between">
                <Link to={Routes.auth.sign_in} className="flex items-center gap-2.5">
                    <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
                    <span className="font-display text-2xl">{environments.APP_NAME}</span>
                </Link>
                <div className="max-w-lg">
                    <h1 className="font-display text-5xl leading-[1.08] tracking-tight">
                        <Trans i18nKey="auth:layout.headline" components={{ em: <span className="italic text-[#e8a55a]" /> }} />
                    </h1>
                    <p className="mt-5 text-[15px] leading-relaxed text-[#a09d96]">{t("layout.description")}</p>
                    <ul className="mt-10 space-y-4">
                        {highlights.map(({ icon: Icon, key }) => (
                            <li key={key} className="flex items-start gap-3 text-sm text-[#d8d4cc]">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#252320] text-[#cc785c]">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-[#6c6a64]">{t("layout.loop")}</p>
                <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#cc785c]/20 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-[#5db8a6]/10 blur-3xl" aria-hidden />
            </aside>
            <main className="relative flex items-center justify-center bg-background px-4 py-10 sm:px-8">
                <div className="absolute right-4 top-4 flex items-center gap-1 sm:right-6 sm:top-6">
                    <LanguageSwitcher variant="full" onChange={syncLanguage} />
                    <ThemeSwitch />
                </div>
                <div className="w-full max-w-[400px]">
                    <Link to={Routes.auth.sign_in} className="mb-8 flex items-center gap-2 lg:hidden">
                        <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
                        <span className="font-display text-2xl">{environments.APP_NAME}</span>
                    </Link>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
