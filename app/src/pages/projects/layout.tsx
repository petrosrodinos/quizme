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

const sections = (id: string) => [
    { label: "Overview", to: Routes.projects.detail(id), end: true },
    { label: "Documents", to: Routes.projects.documents(id) },
    { label: "Tutor", to: Routes.projects.tutor(id) },
    { label: "Quizzes", to: Routes.projects.quizzes(id) },
    { label: "Flashcards", to: Routes.projects.flashcards(id) },
    { label: "Question Bank", to: Routes.projects.questions(id) },
    { label: "Notes", to: Routes.projects.notes(id) },
    { label: "Topics", to: Routes.projects.topics(id) },
    { label: "Summaries", to: Routes.projects.summaries(id) },
    { label: "Recall", to: Routes.projects.recall(id) },
    { label: "Progress", to: Routes.projects.progress(id) },
    { label: "Study Plan", to: Routes.projects.plan(id) },
    { label: "Exam", to: Routes.projects.exam(id) },
    { label: "Members", to: Routes.projects.members(id) },
    { label: "Settings", to: Routes.projects.settings(id) },
];

/** Shell for every /projects/:projectId/* page: header + scrollable section tabs + outlet with project context. */
export default function ProjectLayout() {
    const { projectId } = useParams<{ projectId: string }>();
    const { data: project, isPending, isError, error } = useProjectHeader(projectId);
    const navRef = useRef<HTMLElement>(null);
    const tabs = useMemo(() => sections(projectId ?? ""), [projectId]);
    const context = useMemo(() => (project ? buildProjectContext(project) : null), [project]);
    usePageMetadata({ title: project?.title });

    useEffect(() => {
        navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
    }, [projectId, project]);

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
                    title="Project unavailable"
                    description={error?.message ?? "This project doesn't exist or you don't have access to it."}
                    action={
                        <Button asChild>
                            <Link to={Routes.projects.root}>Back to projects</Link>
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
                        <ArrowLeft className="h-3.5 w-3.5" /> All projects
                    </Link>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate font-display text-2xl sm:text-3xl">{project.title}</h1>
                                {project.archived_at && <Badge variant="outline">Archived</Badge>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {project.subject && <span>{project.subject}</span>}
                                <span>{getProjectStatusLabel(project.status)}</span>
                                {project.exam_date && (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        Exam {formatDate(project.exam_date)}
                                        {days !== null && days >= 0 && ` · ${days} day${days === 1 ? "" : "s"} left`}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                    <Target className="h-3.5 w-3.5" /> Target {project.target_score}%
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                    {getMemberRoleLabel(project.my_role)}
                                </Badge>
                            </div>
                        </div>
                        <div className="w-full shrink-0 sm:w-48">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span className="tabular-nums">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} aria-label="Project progress" />
                        </div>
                    </div>
                    <nav ref={navRef} aria-label="Project sections" className="scrollbar-none -mx-4 mt-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
                        {tabs.map((t) => (
                            <NavLink
                                key={t.to}
                                to={t.to}
                                end={t.end}
                                className={({ isActive }) =>
                                    cn(
                                        "shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                                        isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                                    )
                                }
                            >
                                {t.label}
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
