import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  Link,
  matchPath,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
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
import { useIsPlayful } from "@/hooks/use-ui-mode";
import { PlayfulProjectHeader } from "./components/playful-project-header";
import { findActiveGroup, projectSectionGroups } from "./project-sections";

/** Lesson-style child routes that render full-screen in the playful UI. */
const IMMERSIVE = [
  "/projects/:projectId/quizzes/:quizId/take",
  "/projects/:projectId/attempts/:attemptId",
  "/projects/:projectId/flashcards/review",
];

/** Shell for every /projects/:projectId/* page: header + scrollable section tabs + outlet with project context. */
export default function ProjectLayout() {
  const { t } = useTranslation("projects");
  const { projectId } = useParams<{ projectId: string }>();
  const {
    data: project,
    isPending,
    isError,
    error,
  } = useProjectHeader(projectId);
  const navRef = useRef<HTMLElement>(null);
  const groups = useMemo(
    () => projectSectionGroups(projectId ?? ""),
    [projectId],
  );
  const context = useMemo(
    () => (project ? buildProjectContext(project) : null),
    [project],
  );
  usePageMetadata({ title: project?.title });
  const playful = useIsPlayful();
  const { pathname } = useLocation();
  const immersive = playful && IMMERSIVE.some((p) => matchPath(p, pathname));
  const activeGroup = findActiveGroup(groups, pathname);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    // Scroll only the tab strip (scrollIntoView would also scroll the page / ancestors).
    nav.scrollTo({
      left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [projectId, project]);

  // Mouse wheels only scroll vertically: map them to horizontal scroll over the tab strip.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onWheel = (e: WheelEvent) => {
      if (
        Math.abs(e.deltaY) <= Math.abs(e.deltaX) ||
        nav.scrollWidth <= nav.clientWidth
      )
        return;
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
              <Link to={Routes.projects.root}>
                {t("layout.backToProjects")}
              </Link>
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
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
          <Link
            to={Routes.projects.root}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("layout.allProjects")}
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl sm:text-3xl">
                  {project.title}
                </h1>
                {project.archived_at && (
                  <Badge variant="outline">{t("layout.archived")}</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {project.subject && <span>{project.subject}</span>}
                <span>{getProjectStatusLabel(project.status)}</span>
                {project.exam_date && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("layout.exam", { date: formatDate(project.exam_date) })}
                    {days !== null &&
                      days >= 0 &&
                      ` · ${t("common:time.daysLeft", { count: days })}`}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" />{" "}
                  {t("layout.target", { value: project.target_score })}
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
              <Progress
                value={project.progress}
                aria-label={t("layout.progressLabel")}
              />
            </div>
          </div>
          <nav
            aria-label={t("layout.sectionsLabel")}
            className="-mx-4 mt-4 flex gap-1 overflow-x-auto overscroll-x-contain px-4 pb-px [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {groups.map((g) => {
              const active = g.key === activeGroup.key;
              return (
                <Link
                  key={g.key}
                  to={g.items[0].to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g.key === "overview"
                    ? t("sections.overview")
                    : t(`sections.groups.${g.key}`)}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {activeGroup.items.length > 1 && (
        <div className="border-b border-border">
          <nav
            ref={navRef}
            aria-label={t(`sections.groups.${activeGroup.key}`)}
            className="mx-auto flex w-full max-w-6xl gap-1.5 overflow-x-auto overscroll-x-contain px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {activeGroup.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {t(`sections.${item.key}`)}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
      <Suspense fallback={<PageSkeleton />}>
        <Outlet context={context} />
      </Suspense>
    </div>
  );
}
