import { Suspense, useEffect, useMemo, useRef } from "react";
import { Link, matchPath, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, FolderX } from "lucide-react";
import { useProjectHeader } from "@/features/projects/hooks/use-project-header";
import { Main } from "@/components/layout/main";
import { DetailSkeleton, PageSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate } from "@/lib/date";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { buildProjectContext } from "./hooks/use-project-context";
import { useTranslation } from "react-i18next";
import { useIsPlayful } from "@/hooks/use-ui-mode";
import { PlayfulProjectHeader } from "./components/playful-project-header";
import { findActiveGroup, projectSectionGroups } from "./project-sections";

/** Lesson-style child routes that render full-screen in the playful UI. */
const IMMERSIVE = ["/projects/:projectId/quizzes/:quizId/take", "/projects/:projectId/attempts/:attemptId", "/projects/:projectId/flashcards/review"];

/** Shell for every /projects/:projectId/* page: compact header + grouped section nav + outlet with project context. */
export default function ProjectLayout() {
    const { t } = useTranslation("projects");
    const { projectId } = useParams<{ projectId: string }>();
    const { data: project, isPending, isError, error } = useProjectHeader(projectId);
    const subNavRef = useRef<HTMLElement>(null);
    const groups = useMemo(() => projectSectionGroups(projectId ?? ""), [projectId]);
    const context = useMemo(() => (project ? buildProjectContext(project) : null), [project]);
    usePageMetadata({ title: project?.title });
    const playful = useIsPlayful();
    const { pathname } = useLocation();
    const immersive = playful && IMMERSIVE.some((p) => matchPath(p, pathname));
    const activeGroup = findActiveGroup(groups, pathname);

    useEffect(() => {
        const nav = subNavRef.current;
        const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!nav || !active) return;
        // Scroll only the sub-nav strip (scrollIntoView would also scroll the page / ancestors).
        nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: "auto" });
    }, [projectId, project, activeGroup.key, pathname]);

    // Mouse wheels only scroll vertically: map them to horizontal scroll over the sub-nav strip.
    useEffect(() => {
        const nav = subNavRef.current;
        if (!nav) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || nav.scrollWidth <= nav.clientWidth) return;
            e.preventDefault();
            nav.scrollLeft += e.deltaY;
        };
        nav.addEventListener("wheel", onWheel, { passive: false });
        return () => nav.removeEventListener("wheel", onWheel);
    }, [project, activeGroup.key]);

    if (isPending) {
        return (
            <Main>
                <DetailSkeleton />
            </Main>
        );
    }

    if (isError || !project || !context) {
        return (
            <Main>
                <EmptyState
                    icon={FolderX}
                    title={t("layout.unavailable.title")}
                    description={error?.message ?? t("layout.unavailable.description")}
                    action={
                        <Button asChild>
                            <Link to={Routes.projects.root}>{t("layout.backToProjects")}</Link>
                        </Button>
                    }
                />
            </Main>
        );
    }

    const days = daysUntil(project.exam_date);

    if (playful) {
        return (
            <div className="min-w-0">
                {!immersive && <PlayfulProjectHeader project={project} />}
                <Suspense fallback={<PageSkeleton />}>
                    <Outlet context={context} />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="min-w-0">
            <div className="border-b border-border bg-surface/60">
                <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6 sm:pt-5">
                    <div className="flex items-center gap-2 sm:items-start sm:justify-between sm:gap-6">
                        <Link to={Routes.projects.root} aria-label={t("layout.allProjects")} className="-ml-1.5 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="min-w-0 flex-1">
                            <Link to={Routes.projects.root} className="mb-2 hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:inline-flex">
                                <ArrowLeft className="h-3.5 w-3.5" /> {t("layout.allProjects")}
                            </Link>
                            <div className="flex items-center gap-2">
                                <h1 className="truncate font-display text-xl sm:text-3xl">{project.title}</h1>
                                {project.archived_at && <Badge variant="outline">{t("layout.archived")}</Badge>}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:mt-1">
                                {project.subject && <span className="hidden sm:inline">{project.subject}</span>}
                                {project.exam_date && (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {t("layout.exam", { date: formatDate(project.exam_date) })}
                                        {days !== null && days >= 0 && ` · ${t("common:time.daysLeft", { count: days })}`}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-16 shrink-0 sm:w-48">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                <span className="hidden sm:inline">{t("layout.progress")}</span>
                                <span className="ml-auto tabular-nums">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} aria-label={t("layout.progressLabel")} />
                        </div>
                    </div>
                    {/* Top level: the groups. Equal-width icon+label tabs on phones (no scrolling), underlined text tabs from sm up. */}
                    <nav aria-label={t("layout.sectionsLabel")} className="-mx-4 mt-2 flex sm:mx-0 sm:mt-4 sm:gap-1">
                        {groups.map((g) => {
                            const active = g.key === activeGroup.key;
                            return (
                                <Link
                                    key={g.key}
                                    to={g.items[0].to}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex min-w-0 flex-1 flex-col items-center gap-0.5 border-b-2 px-1 pb-2 pt-1.5 text-[11px] font-medium transition-colors sm:flex-none sm:flex-row sm:gap-1.5 sm:px-3 sm:pb-2.5 sm:pt-1 sm:text-sm",
                                        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <g.icon className="h-[18px] w-[18px] sm:hidden" />
                                    <span className="max-w-full truncate">{g.key === "overview" ? t("sections.overview") : t(`sections.groups.${g.key}`)}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
            {activeGroup.items.length > 1 && (
                <div className="border-b border-border">
                    {/* Second level: the pages of the active group. Scrolls horizontally with a fade hint on phones. */}
                    <nav
                        ref={subNavRef}
                        aria-label={t(`sections.groups.${activeGroup.key}`)}
                        className="mx-auto flex w-full max-w-6xl gap-1.5 overflow-x-auto overscroll-x-contain px-4 py-2 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [scrollbar-width:none] sm:px-6 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {activeGroup.items.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    cn(
                                        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                                        isActive ? "bg-primary/10 font-medium text-foreground ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    )
                                }
                            >
                                <item.icon className="h-3.5 w-3.5" />
                                {t(`sections.${item.key}`)}
                            </NavLink>
                        ))}
                        <span className="w-6 shrink-0 sm:hidden" aria-hidden />
                    </nav>
                </div>
            )}
            <Suspense fallback={<PageSkeleton />}>
                <Outlet context={context} />
            </Suspense>
        </div>
    );
}
