import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mascot } from "@/components/ui/mascot";
import { DailyGoalCard } from "@/components/layout/playful/playful-right-rail";
import { useCurrentCourse } from "@/hooks/use-current-course";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { useRebuildTopics, useTopicTree } from "@/features/topics/hooks/use-topics";
import { useCreateProject } from "@/features/projects/hooks/use-projects";
import { ProjectFormDialog } from "@/pages/projects/components/project-form-dialog";
import { Routes } from "@/routes/routes";
import { daysUntil } from "@/lib/date";
import { LearnPath } from "./learn-path";

const greetingKey = () => {
    const h = new Date().getHours();
    return h < 12 ? "home.greetingMorning" : h < 18 ? "home.greetingAfternoon" : "home.greetingEvening";
};

/** Playful home: the current course's learning path (Duolingo-style). */
export default function LearnHome() {
    const { t } = useTranslation("playful");
    usePageMetadata({ title: t("nav.learn") });
    const { course, isPending } = useCurrentCourse();
    const { data: dashboard } = useDashboard();

    if (isPending) return <PathSkeleton />;
    if (!course) return <NoCourse />;

    const summary = dashboard?.active_projects.find((p) => p.id === course.id);
    const days = daysUntil(course.exam_date);

    return (
        <main id="main-content" className="mx-auto w-full max-w-xl px-4 pt-5 sm:pt-8">
            <div className="mb-5 flex items-center gap-3 xl:hidden">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{t(greetingKey())}</p>
                    <h1 className="truncate text-2xl font-black">{course.title}</h1>
                </div>
            </div>
            <h1 className="mb-1 hidden truncate text-3xl font-black xl:block">{course.title}</h1>

            {(days !== null && days >= 0) || summary ? (
                <div className="mb-5 flex flex-wrap gap-2 text-sm font-extrabold">
                    {days !== null && days >= 0 && (
                        <Link to={Routes.projects.exam(course.id)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1 text-[var(--pf-red)]">
                            <CalendarDays className="size-4" /> {t("home.examIn", { count: days })}
                        </Link>
                    )}
                    {summary && (
                        <Link to={Routes.projects.detail(course.id)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1 text-[var(--pf-blue)]">
                            <Gauge className="size-4" /> {t("home.readiness", { value: summary.readiness })}
                        </Link>
                    )}
                </div>
            ) : null}

            <DailyGoalCard className="mb-8 xl:hidden" />

            <CoursePath projectId={course.id} cardsDue={summary?.cards_due ?? course.cards_due ?? 0} hasDocuments={(course.counts?.documents ?? 0) > 0} />
        </main>
    );
}

const CoursePath = ({ projectId, cardsDue, hasDocuments }: { projectId: string; cardsDue: number; hasDocuments: boolean }) => {
    const { t } = useTranslation("playful");
    const { data: tree, isPending } = useTopicTree(projectId);
    const rebuild = useRebuildTopics(projectId);

    if (isPending) return <PathSkeleton embedded />;
    if (!tree?.length) {
        return (
            <section className="flex flex-col items-center rounded-3xl border-2 border-border px-6 py-10 text-center">
                <Mascot pose="read" animated className="mb-4 size-40" />
                <h2 className="text-xl font-black">{t("home.noTopicsTitle")}</h2>
                <p className="mt-2 max-w-sm font-semibold text-muted-foreground">{t("home.noTopicsDescription")}</p>
                <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
                    <Button asChild size="lg">
                        <Link to={Routes.projects.documents(projectId)}>{t("home.uploadMaterial")}</Link>
                    </Button>
                    {hasDocuments && (
                        <Button variant="outline" size="lg" loading={rebuild.isPending} onClick={() => rebuild.mutate()}>
                            {t("home.buildPath")}
                        </Button>
                    )}
                </div>
            </section>
        );
    }
    return <LearnPath projectId={projectId} tree={tree} cardsDue={cardsDue} />;
};

const NoCourse = () => {
    const { t } = useTranslation("playful");
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const create = useCreateProject();
    return (
        <main id="main-content" className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
            <Mascot pose="wave" animated className="mb-6 size-48" />
            <h1 className="text-2xl font-black">{t("home.emptyTitle")}</h1>
            <p className="mt-3 font-semibold text-muted-foreground">{t("home.emptyDescription")}</p>
            <Button size="lg" className="mt-8 w-full" onClick={() => setOpen(true)}>
                {t("home.createCourse")}
            </Button>
            <ProjectFormDialog
                open={open}
                onOpenChange={setOpen}
                isPending={create.isPending}
                onSubmit={(dto) =>
                    create.mutate(dto, {
                        onSuccess: (p) => {
                            setOpen(false);
                            navigate(Routes.projects.documents(p.id));
                        },
                    })
                }
            />
        </main>
    );
};

const PathSkeleton = ({ embedded }: { embedded?: boolean }) => {
    const body = (
        <div className="flex flex-col items-center gap-6">
            <Skeleton className="mb-4 h-20 w-full rounded-2xl" />
            {[0, 48, 76, 48, 0].map((x, i) => (
                <Skeleton key={i} className="h-[68px] w-[76px] rounded-full" style={{ transform: `translateX(${x}px)` }} />
            ))}
        </div>
    );
    if (embedded) return body;
    return <main className="mx-auto w-full max-w-xl px-4 pt-8">{body}</main>;
};
