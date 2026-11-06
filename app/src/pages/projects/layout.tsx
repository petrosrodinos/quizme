import { Suspense, useEffect, useMemo, useRef } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, FolderX, Target } from "lucide-react";
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
import { getProjectStatusLabel } from "@/config/constants/dropdowns/projects/project-status-form.options";
import { getMemberRoleLabel } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { buildProjectContext } from "./hooks/use-project-context";
import { useTranslation } from "react-i18next";

const sections = (id: string) => [
    { key: "overview", to: Routes.projects.detail(id), end: true },
    { key: "documents", to: Routes.projects.documents(id) },
    { key: "tutor", to: Routes.projects.tutor(id) },
    { key: "quizzes", to: Routes.projects.quizzes(id) },
    { key: "flashcards", to: Routes.projects.flashcards(id) },
    { key: "questions", to: Routes.projects.questions(id) },
    { key: "notes", to: Routes.projects.notes(id) },
    { key: "topics", to: Routes.projects.topics(id) },
    { key: "summaries", to: Routes.projects.summaries(id) },
    { key: "recall", to: Routes.projects.recall(id) },
    { key: "progress", to: Routes.projects.progress(id) },
    { key: "plan", to: Routes.projects.plan(id) },
    { key: "exam", to: Routes.projects.exam(id) },
    { key: "members", to: Routes.projects.members(id) },
    { key: "settings", to: Routes.projects.settings(id) },
];

/** Shell for every /projects/:projectId/* page: header + scrollable section tabs + outlet with project context. */
export default function ProjectLayout() {
    const { t } = useTranslation("projects");
    const { projectId } = useParams<{ projectId: string }>();
    const { data: project, isPending, isError, error } = useProjectHeader(projectId);
    const navRef = useRef<HTMLElement>(null);
    const tabs = useMemo(() => sections(projectId ?? ""), [projectId]);
    const context = useMemo(() => (project ? buildProjectContext(project) : null), [project]);
    usePageMetadata({ title: project?.title });

    useEffect(() => {
        const nav = navRef.current;
        const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!nav || !active) return;
        // Scroll only the tab strip (scrollIntoView would also scroll the page / ancestors).
        nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: "auto" });
    }, [projectId, project]);

    // Mouse wheels only scroll vertically: map them to horizontal scroll over the tab strip.
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || nav.scrollWidth <= nav.clientWidth) return;
            e.preventDefault();
            nav.scrollLeft += e.deltaY;
        };
        nav.addEventListener("wheel", onWheel, { passive: false });
        return () => nav.removeEventListener("wheel", onWheel);
    }, [project]);

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

    return (
        <div className="min-w-0">
            <div className="border-b border-border bg-surface/60">
                <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
                    <Link to={Routes.projects.root} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" /> {t("layout.allProjects")}
                    </Link>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate font-display text-2xl sm:text-3xl">{project.title}</h1>
                                {project.archived_at && <Badge variant="outline">{t("layout.archived")}</Badge>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {project.subject && <span>{project.subject}</span>}
                                <span>{getProjectStatusLabel(project.status)}</span>
                                {project.exam_date && (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {t("layout.exam", { date: formatDate(project.exam_date) })}
                                        {days !== null && days >= 0 && ` · ${t("common:time.daysLeft", { count: days })}`}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                    <Target className="h-3.5 w-3.5" /> {t("layout.target", { value: project.target_score })}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                    {getMemberRoleLabel(project.my_role)}
                                </Badge>
                            </div>
                        </div>
                        <div className="w-full shrink-0 sm:w-48">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                <span>{t("layout.progress")}</span>
                                <span className="tabular-nums">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} aria-label={t("layout.progressLabel")} />
                        </div>
                    </div>
                    <nav ref={navRef} aria-label={t("layout.sectionsLabel")} className="-mx-4 mt-4 flex gap-1 overflow-x-auto overscroll-x-contain px-4 pb-px [scrollbar-width:thin] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                        {tabs.map((tab) => (
                            <NavLink
                                key={tab.to}
                                to={tab.to}
                                end={tab.end}
                                className={({ isActive }) =>
                                    cn(
                                        "shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                                        isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                                    )
                                }
                            >
                                {t(`sections.${tab.key}`)}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>
            <Suspense fallback={<PageSkeleton />}>
                <Outlet context={context} />
            </Suspense>
        </div>
    );
}
