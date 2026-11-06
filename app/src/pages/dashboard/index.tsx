import { Link } from "react-router-dom";
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
import { formatDate } from "@/lib/date";
import { TodayCard } from "./components/today-card";
import { ProgressSideCards } from "./components/progress-side-cards";
import { ActiveProjects } from "./components/active-projects";
import { RecentScoresCard, UpcomingExamsCard, WeakTopicsCard, WeekActivityCard } from "./components/insight-cards";

export default function DashboardPage() {
    usePageMetadata({ title: "Dashboard" });
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
                    title="We couldn't load your dashboard"
                    description={error?.message}
                    action={
                        <Button variant="outline" onClick={() => refetch()}>
                            Try again
                        </Button>
                    }
                />
            </Main>
        );

    const isNew = data.active_projects.length === 0;

    return (
        <Main>
            <PageHeader eyebrow={formatDate(new Date(), "EEEE, MMMM d")} title={data.greeting} description={isNew ? "Let's set up your first study project." : undefined} />

            {isNew ? (
                <EmptyState
                    icon={FolderPlus}
                    title="Create your first study project"
                    description="A project is a course, exam or certification. Upload your material and QuizMe turns it into quizzes, flashcards, summaries and a personal study plan."
                    action={
                        <Button asChild size="lg">
                            <Link to={Routes.projects.root}>Create a project</Link>
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
                        <StatCard label="Flashcards due" value={data.flashcards_due} icon={Layers} tone={data.flashcards_due ? "primary" : "default"} />
                        <StatCard label="Quiz accuracy" value={data.quiz_accuracy ?? "—"} suffix={data.quiz_accuracy !== null ? "%" : undefined} icon={BookOpenCheck} hint="Last 30 days" />
                        <StatCard
                            label="Exam readiness"
                            value={data.exam_readiness ?? "—"}
                            suffix={data.exam_readiness !== null ? "%" : undefined}
                            icon={Gauge}
                            tone={data.exam_readiness !== null && data.exam_readiness >= 80 ? "success" : "default"}
                            hint="Focus project"
                        />
                        <StatCard label="Study time" value={data.study_time.today_min} suffix=" min" icon={Clock} hint={`${data.study_time.week_min} min this week`} />
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
