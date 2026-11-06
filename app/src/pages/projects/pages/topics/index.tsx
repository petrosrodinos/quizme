import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Network, Plus, RefreshCw } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { StatCard } from "@/components/ui/stat-card";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useFeedback } from "@/hooks/use-feedback";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { useCreateTopic, useDeleteTopic, useRebuildTopics, useTopicTree, useUpdateTopic } from "@/features/topics/hooks/use-topics";
import { useCreateQuiz } from "@/features/quizzes/hooks/use-quizzes";
import { QuizModes } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { TopicNode } from "@/features/topics/interfaces/topics.interfaces";
import { CreateQuizDialog, type CreateQuizDefaults } from "@/pages/projects/components/quiz/create-quiz-dialog";
import { MasteryLevelOptions, type MasteryLevel } from "@/config/constants/dropdowns/quizzes/mastery-level.options";
import { TopicTree } from "./components/topic-tree";
import { TopicFormDialog } from "./components/topic-form-dialog";
import type { TopicFormValues } from "./validation-schemas/topic.schema";

const sortWeakFirst = (nodes: TopicNode[]): TopicNode[] =>
    [...nodes]
        .sort((a, b) => (a.attempts ? a.mastery : 101) - (b.attempts ? b.mastery : 101))
        .map((n) => ({ ...n, children: sortWeakFirst(n.children) }));

const walk = (nodes: TopicNode[], out: TopicNode[] = []) => {
    nodes.forEach((n) => {
        out.push(n);
        walk(n.children, out);
    });
    return out;
};

type FormState = { mode: "create"; parent?: TopicNode } | { mode: "rename"; topic: TopicNode } | null;

const LEVEL_COLORS: Record<MasteryLevel, string> = {
    MASTERED: "bg-success",
    STRONG: "bg-teal",
    DEVELOPING: "bg-amber",
    WEAK: "bg-destructive",
    UNPRACTISED: "bg-muted-foreground/30",
};

export default function ProjectTopicsPage() {
    const { t } = useTranslation("topics");
    usePageMetadata({ title: t("page.title") });
    const { projectId, can } = useProjectContext();
    const navigate = useNavigate();
    const { reduceMotion } = useFeedback();
    const { data, isPending } = useTopicTree(projectId);
    const rebuild = useRebuildTopics(projectId);
    const createTopic = useCreateTopic(projectId);
    const updateTopic = useUpdateTopic();
    const deleteTopic = useDeleteTopic();
    const reviewQuiz = useCreateQuiz(projectId);
    const [weakFirst, setWeakFirst] = useState(false);
    const [formState, setFormState] = useState<FormState>(null);
    const [toDelete, setToDelete] = useState<TopicNode | null>(null);
    const [quizDefaults, setQuizDefaults] = useState<CreateQuizDefaults | null>(null);

    const nodes = useMemo(() => (weakFirst ? sortWeakFirst(data ?? []) : data ?? []), [data, weakFirst]);
    const all = useMemo(() => walk(data ?? []), [data]);
    const practised = all.filter((topic) => topic.attempts > 0);
    const mastered = all.filter((topic) => topic.mastered).length;
    const weakest = [...practised].sort((a, b) => a.mastery - b.mastery)[0];
    const avg = practised.length ? Math.round(practised.reduce((s, topic) => s + topic.mastery, 0) / practised.length) : 0;

    const submitForm = (values: TopicFormValues) => {
        if (!formState) return;
        const done = { onSuccess: () => setFormState(null) };
        if (formState.mode === "create") createTopic.mutate({ name: values.name, description: values.description || undefined, parent_id: formState.parent?.id }, done);
        else updateTopic.mutate({ id: formState.topic.id, dto: { name: values.name, description: values.description } }, done);
    };

    const reviewTopic = (topic: TopicNode) =>
        reviewQuiz.mutate(
            { mode: QuizModes.REVIEW, title: t("quizTitles.review", { name: topic.name }), count: 8, review: { source: "topic", topic_id: topic.id, strategy: "new_questions" } },
            { onSuccess: (q) => navigate(Routes.projects.quiz_take(projectId, q.id)) },
        );

    return (
        <Main width="wide">
            <PageHeader
                title={t("page.title")}
                description={t("page.description")}
                actions={
                    can.edit && (
                        <>
                            <Button variant="outline" onClick={() => rebuild.mutate()} loading={rebuild.isPending}>
                                <RefreshCw /> {t("page.rebuild")}
                            </Button>
                            <Button onClick={() => setFormState({ mode: "create" })}>
                                <Plus /> {t("page.add")}
                            </Button>
                        </>
                    )
                }
            />

            {isPending ? (
                <ListSkeleton rows={8} />
            ) : !all.length ? (
                <EmptyState
                    icon={Network}
                    title={t("empty.title")}
                    description={t("empty.description")}
                    action={
                        can.edit && (
                            <Button variant="outline" onClick={() => rebuild.mutate()} loading={rebuild.isPending}>
                                <RefreshCw /> {t("empty.build")}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard label={t("stats.topics")} value={all.length} />
                        <StatCard label={t("stats.mastered")} value={mastered} tone="success" />
                        <StatCard label={t("stats.average")} value={avg} suffix="%" tone="primary" />
                        <StatCard label={t("stats.weakest")} value={weakest ? `${weakest.mastery}%` : "—"} hint={weakest?.name} tone={weakest && weakest.mastery < 50 ? "danger" : "default"} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label={t("legend")}>
                            {MasteryLevelOptions.map((l) => (
                                <span key={l.id} className="inline-flex items-center gap-1.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${LEVEL_COLORS[l.id]}`} aria-hidden /> {l.label}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="weak-first" checked={weakFirst} onCheckedChange={setWeakFirst} />
                            <Label htmlFor="weak-first" className="text-sm">
                                {t("weakestFirst")}
                            </Label>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface/50 p-2 sm:p-4">
                        <TopicTree
                            nodes={nodes}
                            reduceMotion={reduceMotion}
                            onPractice={(topic) => setQuizDefaults({ mode: QuizModes.PRACTICE, topic_ids: [topic.id], title: t("quizTitles.practice", { name: topic.name }) })}
                            onReview={reviewTopic}
                            onAddChild={can.edit ? (topic) => setFormState({ mode: "create", parent: topic }) : undefined}
                            onRename={can.edit ? (topic) => setFormState({ mode: "rename", topic }) : undefined}
                            onDelete={can.edit ? setToDelete : undefined}
                        />
                    </div>
                </div>
            )}

            <CreateQuizDialog projectId={projectId} open={!!quizDefaults} onOpenChange={(o) => !o && setQuizDefaults(null)} defaults={quizDefaults ?? undefined} canShare={can.contribute} />
            <TopicFormDialog
                open={!!formState}
                onOpenChange={(o) => !o && setFormState(null)}
                title={formState?.mode === "rename" ? t("form.renameTitle") : formState?.parent ? t("form.addSubtopicTitle", { name: formState.parent.name }) : t("form.addTitle")}
                initial={formState?.mode === "rename" ? { name: formState.topic.name, description: formState.topic.description ?? "" } : undefined}
                pending={createTopic.isPending || updateTopic.isPending}
                onSubmit={submitForm}
            />
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && deleteTopic.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title={t("delete.title", { name: toDelete?.name ?? "" })}
                description={t("delete.description")}
                confirmText={t("common:actions.delete")}
                variant="destructive"
                isLoading={deleteTopic.isPending}
            />
        </Main>
    );
}
