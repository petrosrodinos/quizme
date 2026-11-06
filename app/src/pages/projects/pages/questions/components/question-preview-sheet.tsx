import { Check, History, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useQuestion, useRestoreQuestionVersion } from "@/features/questions/hooks/use-questions";
import type { Question } from "@/features/questions/interfaces/questions.interfaces";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { getQuestionDifficultyLabel } from "@/config/constants/dropdowns/quizzes/question-difficulty-form.options";
import { getQuestionOriginLabel } from "@/config/constants/dropdowns/quizzes/question-origin-filter.options";
import { SourceCitation } from "@/pages/projects/components/quiz/answer-feedback";

interface QuestionPreviewSheetProps {
    projectId: string;
    questionId: string | null;
    canEdit: boolean;
    onClose: () => void;
    onEdit: (q: Question) => void;
}

/** Renders the question with its correct answer (editor/bank view). */
export const AnswerKey = ({ question }: { question: Pick<Question, "type" | "data"> }) => {
    const { t } = useTranslation("questions");
    const d = question.data;
    switch (question.type) {
        case "MCQ":
        case "MULTI_SELECT": {
            const correct = Array.isArray(d.correct) ? d.correct : [];
            return (
                <ul className="space-y-1.5">
                    {(d.options ?? []).map((o, i) => (
                        <li key={i} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", correct.includes(i) ? "border-success/50 bg-success/8" : "border-border")}>
                            {correct.includes(i) ? <Check className="mt-0.5 h-4 w-4 text-success" /> : <X className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                            {o}
                        </li>
                    ))}
                </ul>
            );
        }
        case "TRUE_FALSE":
            return <p className="text-sm">{t("preview.answer")} <strong>{d.correct === true ? t("quiz:inputs.true") : t("quiz:inputs.false")}</strong></p>;
        case "FILL_BLANK":
            return <p className="text-sm">{t("preview.accepted")} <strong>{(d.answers ?? []).join(", ")}</strong></p>;
        case "MATCHING":
            return (
                <ul className="space-y-1 text-sm">
                    {(d.pairs ?? []).map((p) => (
                        <li key={p.left}>
                            <strong>{p.left}</strong> → {p.right}
                        </li>
                    ))}
                </ul>
            );
        case "ORDERING":
            return (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {(d.items ?? []).map((i) => (
                        <li key={i}>{i}</li>
                    ))}
                </ol>
            );
        default:
            return (
                <div className="space-y-2 text-sm">
                    <Markdown content={d.expected_answer ?? ""} />
                    {!!d.key_concepts?.length && <p className="text-muted-foreground">{t("preview.keyConcepts", { concepts: d.key_concepts.join(", ") })}</p>}
                </div>
            );
    }
};

export const QuestionPreviewSheet = ({ projectId, questionId, canEdit, onClose, onEdit }: QuestionPreviewSheetProps) => {
    const { t } = useTranslation("questions");
    const { data: q, isPending } = useQuestion(questionId ?? undefined);
    const restore = useRestoreQuestionVersion();
    return (
        <Sheet open={!!questionId} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle className="font-display text-xl font-normal">{t("preview.title")}</SheetTitle>
                    <SheetDescription>{q ? t("preview.subtitle", { type: getQuestionTypeLabel(q.type), version: q.version }) : t("common:status.loading")}</SheetDescription>
                </SheetHeader>
                {isPending || !q ? (
                    <div className="p-4">
                        <DetailSkeleton />
                    </div>
                ) : (
                    <div className="space-y-5 px-4 pb-8">
                        <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{getQuestionDifficultyLabel(q.difficulty)}</Badge>
                            <Badge variant="outline">{getQuestionOriginLabel(q.origin)}</Badge>
                            {q.topic && <Badge variant="outline">{q.topic.name}</Badge>}
                            {q.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="font-normal">
                                    #{tag}
                                </Badge>
                            ))}
                        </div>
                        <div className="font-display text-lg">
                            <Markdown content={q.prompt} />
                        </div>
                        <AnswerKey question={q} />
                        {q.explanation && (
                            <div className="rounded-xl bg-surface p-3 text-sm">
                                <div className="mb-1 font-medium">{t("quiz:player.explanation")}</div>
                                <Markdown content={q.explanation} />
                            </div>
                        )}
                        <SourceCitation projectId={projectId} source={q.source_ref} />
                        <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            {q.concept && (
                                <>
                                    <dt>{t("editor.concept")}</dt>
                                    <dd className="text-foreground">{q.concept}</dd>
                                </>
                            )}
                            {q.generation_model && (
                                <>
                                    <dt>{t("preview.generatedBy")}</dt>
                                    <dd className="text-foreground">{q.generation_model}</dd>
                                </>
                            )}
                            <dt>{t("preview.created")}</dt>
                            <dd className="text-foreground">{formatDateTime(q.generated_at ?? q.created_at)}</dd>
                            <dt>{t("preview.modified")}</dt>
                            <dd className="text-foreground">{formatDateTime(q.updated_at)}</dd>
                        </dl>
                        {canEdit && (
                            <Button onClick={() => onEdit(q)} className="w-full">
                                {t("preview.edit")}
                            </Button>
                        )}
                        {!!q.versions?.length && (
                            <section>
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                    <History className="h-4 w-4" /> {t("preview.history")}
                                </h3>
                                <ul className="space-y-2">
                                    {q.versions.map((v) => (
                                        <li key={v.id} className="rounded-lg border border-border p-3 text-sm">
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="font-medium">v{v.version}</span>
                                                <span className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</span>
                                            </div>
                                            <p className="line-clamp-2 text-muted-foreground">{v.snapshot.prompt}</p>
                                            {canEdit && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mt-1 px-2"
                                                    loading={restore.isPending && restore.variables?.version === v.version}
                                                    onClick={() => restore.mutate({ id: q.id, version: v.version })}
                                                >
                                                    {t("preview.restore")}
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};
