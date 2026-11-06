import { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, BookOpenText, Brain, CalendarCheck, FileText, GraduationCap, Layers, LayoutGrid, ListChecks, MessageCircle, NotebookPen, ScrollText, Settings, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { CourseBadge } from "@/components/layout/playful/course-badge";
import type { ProjectHeader } from "@/features/projects/interfaces/project-header.interfaces";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

const sections = (id: string) => [
    { key: "overview", to: Routes.projects.detail(id), end: true, icon: LayoutGrid, color: "var(--pf-green)" },
    { key: "quizzes", to: Routes.projects.quizzes(id), icon: ListChecks, color: "var(--pf-blue)" },
    { key: "flashcards", to: Routes.projects.flashcards(id), icon: Layers, color: "var(--pf-orange)" },
    { key: "tutor", to: Routes.projects.tutor(id), icon: MessageCircle, color: "var(--pf-purple)" },
    { key: "documents", to: Routes.projects.documents(id), icon: FileText, color: "var(--pf-blue)" },
    { key: "notes", to: Routes.projects.notes(id), icon: NotebookPen, color: "var(--pf-yellow-ridge)" },
    { key: "topics", to: Routes.projects.topics(id), icon: BookOpenText, color: "var(--pf-green)" },
    { key: "summaries", to: Routes.projects.summaries(id), icon: ScrollText, color: "var(--pf-purple)" },
    { key: "recall", to: Routes.projects.recall(id), icon: Brain, color: "var(--pf-red)" },
    { key: "progress", to: Routes.projects.progress(id), icon: BarChart3, color: "var(--pf-blue)" },
    { key: "plan", to: Routes.projects.plan(id), icon: CalendarCheck, color: "var(--pf-green)" },
    { key: "exam", to: Routes.projects.exam(id), icon: GraduationCap, color: "var(--pf-red)" },
    { key: "questions", to: Routes.projects.questions(id), icon: Sparkles, color: "var(--pf-orange)" },
    { key: "members", to: Routes.projects.members(id), icon: Users, color: "var(--pf-purple)" },
    { key: "settings", to: Routes.projects.settings(id), icon: Settings, color: "var(--muted-foreground)" },
];

/** Compact, thumb-friendly project header for the playful UI: back, course badge, progress and icon chips. */
export const PlayfulProjectHeader = ({ project }: { project: ProjectHeader }) => {
    const { t } = useTranslation("projects");
    const { t: tp } = useTranslation("playful");
    const { ref: navRef, canLeft, canRight, scrollByPage } = useHorizontalScroll<HTMLElement>([project.id]);

    useEffect(() => {
        const nav = navRef.current;
        const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!nav || !active) return;
        const left = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
        nav.scrollTo({ left: Math.max(0, left - (nav.clientWidth - active.offsetWidth) / 2) });
    }, [navRef, project.id]);

    return (
        <div className="border-b-2 border-border">
            <div className="mx-auto w-full max-w-5xl px-4 pt-4">
                <div className="flex items-center gap-3">
                    <Link to={Routes.projects.root} className="grid size-10 shrink-0 place-items-center rounded-xl hover:bg-muted" aria-label={tp("project.back")}>
                        <ArrowLeft className="size-6 text-muted-foreground" strokeWidth={2.6} />
                    </Link>
                    <CourseBadge id={project.id} title={project.title} className="size-10 text-base" />
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-xl font-black leading-tight">{project.title}</h1>
                        <div className="mt-1.5 flex items-center gap-2">
                            <Progress value={project.progress} className="!h-2.5 flex-1" aria-label={t("layout.progressLabel")} />
                            <span className="text-xs font-black tabular-nums text-muted-foreground">{project.progress}%</span>
                        </div>
                    </div>
                </div>
                <div className="relative -mx-4 mt-4">
                    <nav ref={navRef} aria-label={tp("project.sections")} className="scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-3 select-none">
                        {sections(project.id).map(({ key, to, end, icon: Icon, color }) => (
                            <NavLink
                                key={key}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    cn(
                                        "inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[13px] font-extrabold transition-colors",
                                        isActive ? "border-current bg-[color-mix(in_srgb,currentColor_10%,transparent)]" : "border-border text-muted-foreground hover:bg-muted",
                                    )
                                }
                                style={({ isActive }) => (isActive ? { color } : undefined)}
                            >
                                <Icon className="size-4" strokeWidth={2.6} style={{ color }} />
                                {t(`sections.${key}`)}
                            </NavLink>
                        ))}
                    </nav>
                    {canLeft && (
                        <>
                            <span className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" aria-hidden />
                            <button
                                type="button"
                                onClick={() => scrollByPage(-1)}
                                aria-label={tp("project.scrollLeft")}
                                className="absolute left-1 top-[calc(50%-6px)] hidden size-8 -translate-y-1/2 place-items-center rounded-full border-2 border-border bg-background text-muted-foreground shadow-[0_2px_0_0_var(--pf-gray-ridge)] hover:text-foreground sm:grid"
                            >
                                <ChevronLeft className="size-4" strokeWidth={3} />
                            </button>
                        </>
                    )}
                    {canRight && (
                        <>
                            <span className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" aria-hidden />
                            <button
                                type="button"
                                onClick={() => scrollByPage(1)}
                                aria-label={tp("project.scrollRight")}
                                className="absolute right-1 top-[calc(50%-6px)] hidden size-8 -translate-y-1/2 place-items-center rounded-full border-2 border-border bg-background text-muted-foreground shadow-[0_2px_0_0_var(--pf-gray-ridge)] hover:text-foreground sm:grid"
                            >
                                <ChevronRight className="size-4" strokeWidth={3} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
