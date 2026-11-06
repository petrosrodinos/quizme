import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { isNavItemActive, playfulNavItems } from "./nav-items";

/** Native-app style bottom navigation for phones and tablets. */
export const BottomTabBar = () => {
    const { t } = useTranslation("playful");
    const { pathname } = useLocation();
    return (
        <nav
            aria-label={t("nav.primary")}
            className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden"
        >
            <ul className="mx-auto grid h-16 max-w-xl grid-cols-5 px-1">
                {playfulNavItems.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    const Icon = item.icon;
                    return (
                        <li key={item.key} className="flex">
                            <Link
                                to={item.to}
                                aria-current={active ? "page" : undefined}
                                className="group flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={active ? { color: item.color } : undefined}
                            >
                                <span
                                    className={cn(
                                        "grid h-8 w-12 place-items-center rounded-xl border-2 border-transparent transition-all",
                                        active ? "scale-105" : "text-muted-foreground group-active:scale-90",
                                    )}
                                    style={active ? { borderColor: item.color, background: `color-mix(in srgb, ${item.color} 14%, transparent)` } : undefined}
                                >
                                    <Icon className="size-5" strokeWidth={2.6} />
                                </span>
                                <span className={cn("leading-none", !active && "text-muted-foreground")}>{t(`nav.${item.key}`)}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};
