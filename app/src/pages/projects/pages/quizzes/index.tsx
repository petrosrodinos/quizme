import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, GraduationCap, Plus } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GridSkeleton } from "@/components/ui/card-skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { useCreateQuiz, useDeleteQuiz, useQuizzes, useShareQuiz } from "@/features/quizzes/hooks/use-quizzes";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { QuizModes, type GenerationStatusEvent, type Quiz, type ReviewConfig } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { CreateQuizDialog } from "@/pages/projects/components/quiz/create-quiz-dialog";
import { QuizCard } from "./components/quiz-card";
import { AttemptHistory } from "./components/attempt-history";
import { ReviewPanel } from "./components/review-panel";
import { GroupResultsDialog } from "./components/group-results-dialog";

export default function ProjectQuizzesPage() {
    const { t } = useTranslation("quizzes");
    usePageMetadata({ title: t("page.title") });
    const { project, projectId, can } = useProjectContext();
    const userId = useAuthStore((s) => s.user?.id);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: quizzes, isPending } = useQuizzes(projectId);
    const deleteQuiz = useDeleteQuiz();
    const shareQuiz = useShareQuiz();
    const createReview = useCreateQuiz(projectId);
    const [createOpen, setCreateOpen] = useState(false);
    const [toDelete, setToDelete] = useState<Quiz | null>(null);
    const [resultsId, setResultsId] = useState<string | null>(null);
    const [tab, setTab] = useState("quizzes");

    useRealtimeEvent<GenerationStatusEvent>(RealtimeEvents.GENERATION_STATUS, (e) => {
        if (e.kind === "quiz" && e.project_id === projectId) queryClient.invalidateQueries({ queryKey: ["quizzes", projectId] });
    });

    const startReview = (review: ReviewConfig, title: string) =>
        createReview.mutate(
            { mode: QuizModes.REVIEW, review, title, count: 10 },
            { onSuccess: (quiz) => navigate(Routes.projects.quiz_take(projectId, quiz.id)) },
        );

    const visible = (quizzes ?? []).filter((q) => q.mode !== QuizModes.EXAM);

    return (
        <Main width="wide">
            <PageHeader
                title={t("page.title")}
                description={t("page.description")}
                actions={
                    <>
                        <Button variant="outline" onClick={() => navigate(Routes.projects.exam(projectId))}>
                            <GraduationCap /> {t("page.examSimulation")}
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus /> {t("page.newQuiz")}
                        </Button>
                    </>
                }
            />

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-5">
                    <TabsTrigger value="quizzes">{t("tabs.quizzes")}</TabsTrigger>
                    <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
                    <TabsTrigger value="review">{t("tabs.review")}</TabsTrigger>
                </TabsList>

                <TabsContent value="quizzes">
                    {isPending ? (
                        <GridSkeleton />
                    ) : visible.length ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {visible.map((q) => (
                                <QuizCard
                                    key={q.id}
                                    projectId={projectId}
                                    quiz={q}
                                    canShare={can.contribute}
                                    canDelete={can.edit || q.created_by === userId}
                                    onDelete={setToDelete}
                                    onShare={(quiz) => shareQuiz.mutate(quiz.id)}
                                    onResults={(quiz) => setResultsId(quiz.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={ClipboardList}
                            title={t("empty.title")}
                            description={t("empty.description")}
                            action={
                                <Button onClick={() => setCreateOpen(true)}>
                                    <Plus /> {t("page.newQuiz")}
                                </Button>
                            }
                        />
                    )}
                </TabsContent>
                <TabsContent value="history">
                    <AttemptHistory projectId={projectId} targetScore={project.target_score} />
                </TabsContent>
                <TabsContent value="review">
                    <ReviewPanel projectId={projectId} onStartReview={startReview} pending={createReview.isPending} />
                </TabsContent>
            </Tabs>

            <CreateQuizDialog projectId={projectId} open={createOpen} onOpenChange={setCreateOpen} canShare={can.contribute} />
            <GroupResultsDialog quizId={resultsId} onClose={() => setResultsId(null)} />
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && deleteQuiz.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title={t("delete.title")}
                description={t("delete.description")}
                confirmText={t("common:actions.delete")}
                variant="destructive"
                isLoading={deleteQuiz.isPending}
            />
        </Main>
    );
}
