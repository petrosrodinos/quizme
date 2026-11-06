import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    usePageMetadata({ title: "Knowledge map" });
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
    const practised = all.filter((t) => t.attempts > 0);
    const mastered = all.filter((t) => t.mastered).length;
    const weakest = [...practised].sort((a, b) => a.mastery - b.mastery)[0];
    const avg = practised.length ? Math.round(practised.reduce((s, t) => s + t.mastery, 0) / practised.length) : 0;

    const submitForm = (values: TopicFormValues) => {
        if (!formState) return;
        const done = { onSuccess: () => setFormState(null) };
        if (formState.mode === "create") createTopic.mutate({ name: values.name, description: values.description || undefined, parent_id: formState.parent?.id }, done);
        else updateTopic.mutate({ id: formState.topic.id, dto: { name: values.name, description: values.description } }, done);
    };

    const reviewTopic = (t: TopicNode) =>
        reviewQuiz.mutate(
            { mode: QuizModes.REVIEW, title: `Review: ${t.name}`, count: 8, review: { source: "topic", topic_id: t.id, strategy: "new_questions" } },
            { onSuccess: (q) => navigate(Routes.projects.quiz_take(projectId, q.id)) },
        );

    return (
        <Main width="wide">
            <PageHeader
                title="Knowledge map"
                description="Topics detected in your material, with your mastery of each. Weak areas are where your next study minutes pay off most."
                actions={
                    can.edit && (
                        <>
                            <Button variant="outline" onClick={() => rebuild.mutate()} loading={rebuild.isPending}>
                                <RefreshCw /> Rebuild map
                            </Button>
                            <Button onClick={() => setFormState({ mode: "create" })}>
                                <Plus /> Add topic
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
                    title="No topics yet"
                    description="Your knowledge map is built automatically after documents finish processing. You can also add topics manually."
                    action={
                        can.edit && (
                            <Button variant="outline" onClick={() => rebuild.mutate()} loading={rebuild.isPending}>
                                <RefreshCw /> Build map now
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard label="Topics" value={all.length} />
                        <StatCard label="Mastered" value={mastered} tone="success" />
                        <StatCard label="Average mastery" value={avg} suffix="%" tone="primary" />
                        <StatCard label="Weakest" value={weakest ? `${weakest.mastery}%` : "—"} hint={weakest?.name} tone={weakest && weakest.mastery < 50 ? "danger" : "default"} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
                            {MasteryLevelOptions.map((l) => (
                                <span key={l.id} className="inline-flex items-center gap-1.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${LEVEL_COLORS[l.id]}`} aria-hidden /> {l.label}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="weak-first" checked={weakFirst} onCheckedChange={setWeakFirst} />
                            <Label htmlFor="weak-first" className="text-sm">
                                Weakest first
                            </Label>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface/50 p-2 sm:p-4">
                        <TopicTree
                            nodes={nodes}
                            reduceMotion={reduceMotion}
                            onPractice={(t) => setQuizDefaults({ mode: QuizModes.PRACTICE, topic_ids: [t.id], title: `Practice: ${t.name}` })}
                            onReview={reviewTopic}
                            onAddChild={can.edit ? (t) => setFormState({ mode: "create", parent: t }) : undefined}
                            onRename={can.edit ? (t) => setFormState({ mode: "rename", topic: t }) : undefined}
                            onDelete={can.edit ? setToDelete : undefined}
                        />
                    </div>
                </div>
            )}

            <CreateQuizDialog projectId={projectId} open={!!quizDefaults} onOpenChange={(o) => !o && setQuizDefaults(null)} defaults={quizDefaults ?? undefined} canShare={can.contribute} />
            <TopicFormDialog
                open={!!formState}
                onOpenChange={(o) => !o && setFormState(null)}
                title={formState?.mode === "rename" ? "Rename topic" : formState?.parent ? `Add subtopic to ${formState.parent.name}` : "Add topic"}
                initial={formState?.mode === "rename" ? { name: formState.topic.name, description: formState.topic.description ?? "" } : undefined}
                pending={createTopic.isPending || updateTopic.isPending}
                onSubmit={submitForm}
            />
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && deleteTopic.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title={`Delete "${toDelete?.name}"?`}
                description="Subtopics are removed too. Questions and flashcards stay, but lose this topic label."
                confirmText="Delete"
                variant="destructive"
                isLoading={deleteTopic.isPending}
            />
        </Main>
    );
}
