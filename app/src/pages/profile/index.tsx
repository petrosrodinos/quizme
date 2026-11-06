import { Link } from "react-router-dom";
import { ChevronRight, LogOut, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Illo, Mascot } from "@/components/ui/mascot";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayfulMoreLinks } from "@/components/layout/playful/playful-side-nav";
import { useAuthStore } from "@/stores/auth";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useAchievements, useGamificationProfile } from "@/features/gamification/hooks/use-gamification";
import { useLogout } from "@/features/auth/hooks/use-auth";
import { getAchievementText } from "@/config/constants/dropdowns/gamification/achievement-text.options";
import { getLevelTitleLabel } from "@/config/constants/dropdowns/gamification/level-title.options";
import { UiModePicker } from "@/pages/settings/components/ui-mode-picker";
import { achievementIcon } from "@/pages/achievements/components/achievement-card";
import { displayName } from "@/lib/display-name";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";

const THEMES: Theme[] = ["light", "dark", "system"];

/** Duolingo-style profile: identity, stats, badges, app style switch and account links. */
export default function ProfilePage() {
    const { t } = useTranslation("playful");
    usePageMetadata({ title: t("profile.title") });
    const user = useAuthStore((s) => s.user);
    const { data: profile, isPending } = useGamificationProfile();
    const { data: achievements } = useAchievements();
    const { theme, setTheme } = useTheme();
    const logout = useLogout();
    const name = user ? displayName(user) : "";
    const unlocked = achievements?.filter((a) => a.unlocked) ?? [];
    const showcase = [...unlocked, ...(achievements?.filter((a) => !a.unlocked && !a.hidden) ?? [])].slice(0, 6);

    return (
        <main id="main-content" className="mx-auto w-full max-w-2xl space-y-8 px-4 pt-6">
            {/* Identity */}
            <section className="relative overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--pf-blue)_16%,var(--background))] px-5 pb-6 pt-8">
                <Mascot pose="wave" className="absolute -bottom-3 right-2 size-32 sm:size-40" />
                <UserAvatar name={name} src={user?.avatar_url} className="size-20 border-4 border-background text-xl" />
                <h1 className="mt-3 max-w-[60%] truncate text-2xl font-black">{name}</h1>
                <p className="max-w-[60%] truncate text-sm font-bold text-muted-foreground">{user?.email}</p>
                {user?.created_at && <p className="mt-1 text-sm font-bold text-muted-foreground">{t("profile.joined", { date: formatDate(user.created_at, "MMMM yyyy") })}</p>}
                <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link to={Routes.settings.profile}>
                        <Pencil /> {t("profile.editProfile")}
                    </Link>
                </Button>
            </section>

            {/* Stats */}
            <section aria-labelledby="pf-stats">
                <h2 id="pf-stats" className="mb-3 text-xl font-black">
                    {t("profile.statistics")}
                </h2>
                {isPending || !profile ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={<Illo name="flame" className="size-8" />} value={formatNumber(profile.current_streak)} label={t("stats.streakShort")} />
                        <StatTile icon={<Illo name="gem" className="size-8" />} value={formatNumber(profile.total_xp)} label={t("stats.xpShort")} />
                        <StatTile
                            icon={<span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-purple)] text-sm font-black text-white">{profile.level}</span>}
                            value={getLevelTitleLabel(profile.level_title)}
                            label={t("stats.levelShort")}
                        >
                            <Progress value={(profile.xp_into_level / Math.max(1, profile.xp_for_next_level)) * 100} className="mt-2 !h-2.5" aria-label={t("stats.levelShort")} />
                        </StatTile>
                        <StatTile icon={<Mascot pose="trophy" className="size-8" />} value={formatNumber(unlocked.length)} label={t("stats.badgesShort")} />
                    </div>
                )}
            </section>

            {/* Achievements */}
            {showcase.length > 0 && (
                <section aria-labelledby="pf-badges">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 id="pf-badges" className="text-xl font-black">
                            {t("profile.achievements")}
                        </h2>
                        <Link to={Routes.achievements} className="text-sm font-extrabold uppercase tracking-wide text-[var(--pf-blue)]">
                            {t("profile.seeAll")}
                        </Link>
                    </div>
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                        {showcase.map((a) => {
                            const text = getAchievementText(a);
                            const Icon = achievementIcon(a.icon);
                            return (
                                <li key={a.key} className="flex flex-col items-center text-center" title={text.description}>
                                    <span
                                        className={cn(
                                            "grid size-16 place-items-center rounded-2xl",
                                            a.unlocked ? "bg-[var(--pf-yellow)] text-white shadow-[0_4px_0_0_var(--pf-yellow-ridge)]" : "bg-muted text-muted-foreground opacity-70",
                                        )}
                                        aria-hidden
                                    >
                                        <Icon className="size-8" strokeWidth={2.5} />
                                    </span>
                                    <span className="mt-2 line-clamp-2 text-xs font-extrabold">{text.title}</span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Appearance */}
            <section aria-labelledby="pf-appearance" className="space-y-4">
                <div>
                    <h2 id="pf-appearance" className="text-xl font-black">
                        {t("profile.uiMode")}
                    </h2>
                    <p className="text-sm font-semibold text-muted-foreground">{t("profile.uiModeDescription")}</p>
                </div>
                <UiModePicker />
                <div>
                    <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{t("profile.theme")}</h3>
                    <div role="radiogroup" aria-label={t("profile.theme")} className="grid grid-cols-3 gap-2">
                        {THEMES.map((th) => (
                            <button
                                key={th}
                                type="button"
                                role="radio"
                                aria-checked={theme === th}
                                onClick={() => setTheme(th)}
                                className={cn(
                                    "rounded-xl border-2 py-2.5 text-sm font-extrabold transition-colors",
                                    theme === th ? "border-[var(--pf-blue)] text-[var(--pf-blue)]" : "border-border text-muted-foreground hover:bg-muted",
                                )}
                            >
                                {t(`profile.themes.${th}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Links */}
            <section aria-labelledby="pf-links">
                <h2 id="pf-links" className="mb-3 text-xl font-black">
                    {t("profile.links")}
                </h2>
                <ul className="divide-y-2 divide-border overflow-hidden rounded-2xl border-2 border-border">
                    {PlayfulMoreLinks.map(({ key, to, icon: Icon }) => (
                        <li key={key}>
                            <Link to={to} className="flex items-center gap-3 px-4 py-3.5 font-extrabold hover:bg-muted">
                                <Icon className="size-5 text-muted-foreground" />
                                <span className="flex-1">{t(`nav.${key}`)}</span>
                                <ChevronRight className="size-5 text-muted-foreground" />
                            </Link>
                        </li>
                    ))}
                    <li>
                        <button type="button" onClick={() => logout.mutate()} className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-extrabold text-destructive hover:bg-muted">
                            <LogOut className="size-5" />
                            <span className="flex-1">{t("nav.signOut")}</span>
                        </button>
                    </li>
                </ul>
            </section>
        </main>
    );
}

const StatTile = ({ icon, value, label, children }: { icon: React.ReactNode; value: string; label: string; children?: React.ReactNode }) => (
    <div className="rounded-2xl border-2 border-border p-3.5">
        <div className="flex items-center gap-3">
            <span className="shrink-0">{icon}</span>
            <div className="min-w-0">
                <div className="truncate text-lg font-black leading-tight">{value}</div>
                <div className="truncate text-xs font-bold text-muted-foreground">{label}</div>
            </div>
        </div>
        {children}
    </div>
);
