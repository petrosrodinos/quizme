import { lazy } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, Clock, FolderPlus, Gauge, Layers } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { Routes } from "@/routes/routes";
import { formatDate, greeting } from "@/lib/date";
import { useAuthStore } from "@/stores/auth";
import { useIsPlayful } from "@/hooks/use-ui-mode";
import { TodayCard } from "./components/today-card";
import { ProgressSideCards } from "./components/progress-side-cards";
import { ActiveProjects } from "./components/active-projects";
import { RecentScoresCard, UpcomingExamsCard, WeakTopicsCard, WeekActivityCard } from "./components/insight-cards";

const LearnHome = lazy(() => import("./components/playful/learn-home"));

/** Home: the learning path in playful mode, the analytics dashboard in classic mode. */
export default function DashboardPage() {
    return useIsPlayful() ? <LearnHome /> : <ClassicDashboard />;
}

function ClassicDashboard() {
    const { t } = useTranslation("dashboard");
    usePageMetadata({ title: t("pageTitle") });
    const user = useAuthStore((s) => s.user);
    const { data, isPending, isError, error, refetch } = useDashboard();

    if (isPending)
        return (
            <Main>
                <DetailSkeleton />
            </Main>
        );

    if (isError || !data)
        return (
            <Main>
                <EmptyState
                    title={t("loadError")}
                    description={error?.message}
                    action={
                        <Button variant="outline" onClick={() => refetch()}>
                            {t("common:actions.tryAgain")}
                        </Button>
                    }
                />
            </Main>
        );

    const isNew = data.active_projects.length === 0;
    const firstName = (user?.full_name || data.greeting.split(",").slice(1).join(",").trim() || user?.email?.split("@")[0] || "").split(" ")[0];
    const title = firstName ? t("greeting", { greeting: greeting(), name: firstName }) : greeting();

    return (
        <Main>
            <PageHeader eyebrow={formatDate(new Date(), "EEEE, d MMMM")} title={title} description={isNew ? t("newUser.subtitle") : undefined} />

            {isNew ? (
                <EmptyState
                    icon={FolderPlus}
                    title={t("newUser.title")}
                    description={t("newUser.description")}
                    action={
                        <Button asChild size="lg">
                            <Link to={Routes.projects.root}>{t("newUser.cta")}</Link>
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-8">
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <TodayCard data={data} />
                        </div>
                        <ProgressSideCards profile={data.gamification} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label={t("stats.flashcardsDue")} value={data.flashcards_due} icon={Layers} tone={data.flashcards_due ? "primary" : "default"} />
                        <StatCard label={t("stats.quizAccuracy")} value={data.quiz_accuracy ?? "—"} suffix={data.quiz_accuracy !== null ? "%" : undefined} icon={BookOpenCheck} hint={t("stats.last30Days")} />
                        <StatCard
                            label={t("stats.examReadiness")}
                            value={data.exam_readiness ?? "—"}
                            suffix={data.exam_readiness !== null ? "%" : undefined}
                            icon={Gauge}
                            tone={data.exam_readiness !== null && data.exam_readiness >= 80 ? "success" : "default"}
                            hint={t("stats.focusProject")}
                        />
                        <StatCard label={t("stats.studyTime")} value={data.study_time.today_min} suffix={` ${t("stats.minSuffix")}`} icon={Clock} hint={t("stats.weekMinutes", { count: data.study_time.week_min })} />
                    </div>

                    <ActiveProjects projects={data.active_projects} />

                    <div className="grid gap-4 lg:grid-cols-2">
                        <WeekActivityCard week={data.week} goalMinutes={data.gamification.daily_goal.minutes} />
                        <RecentScoresCard scores={data.recent_scores} />
                        <WeakTopicsCard topics={data.weak_topics} />
                        <UpcomingExamsCard exams={data.upcoming_exams} />
                    </div>
                </div>
            )}
        </Main>
    );
}
