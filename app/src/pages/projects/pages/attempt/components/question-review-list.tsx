import { useState } from "react";
import { CheckCircle2, ChevronDown, MinusCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Markdown } from "@/components/ui/markdown";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AttemptQuestion, CorrectAnswer } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { QuestionInput } from "@/pages/projects/components/quiz/question-inputs";
import { EvaluationPanel, SourceCitation } from "@/pages/projects/components/quiz/answer-feedback";

interface QuestionReviewListProps {
    projectId: string;
    questions: AttemptQuestion[];
}

type Filter = "all" | "incorrect" | "correct";

/** Full post-attempt review: your answer vs the correct one, explanation, AI feedback and source. */
export const QuestionReviewList = ({ projectId, questions }: QuestionReviewListProps) => {
    const { t } = useTranslation("attempt");
    const [filter, setFilter] = useState<Filter>("incorrect");
    const shown = questions.filter((q) => (filter === "all" ? true : filter === "correct" ? q.response?.is_correct : !q.response?.is_correct));
    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl">{t("review.title")}</h2>
                <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                    <TabsList>
                        <TabsTrigger value="incorrect">{t("review.incorrect")}</TabsTrigger>
                        <TabsTrigger value="correct">{t("review.correct")}</TabsTrigger>
                        <TabsTrigger value="all">{t("common:status.all")}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            {!shown.length && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("review.emptyFilter")}</p>}
            {shown.map((q) => (
                <ReviewItem key={q.id} projectId={projectId} question={q} index={questions.indexOf(q)} defaultOpen={filter === "incorrect"} />
            ))}
        </section>
    );
};

const ReviewItem = ({ projectId, question, index, defaultOpen }: { projectId: string; question: AttemptQuestion; index: number; defaultOpen: boolean }) => {
    const { t } = useTranslation("attempt");
    const [open, setOpen] = useState(defaultOpen);
    const r = question.response;
    const answered = !!r?.answered && !r?.feedback?.skipped;
    const correct = (r?.correct_answer ?? r?.feedback?.correct_answer ?? null) as CorrectAnswer | null;
    const Icon = !answered ? MinusCircle : r?.is_correct ? CheckCircle2 : XCircle;
    const tone = !answered ? "text-muted-foreground" : r?.is_correct ? "text-success" : (r?.score ?? 0) > 0 ? "text-warning" : "text-destructive";
    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border bg-card">
            <CollapsibleTrigger className="flex w-full items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone)} aria-label={!answered ? t("review.unanswered") : r?.is_correct ? t("review.correct") : t("review.incorrect")} />
                <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                        {t("review.q", { number: index + 1 })} · {getQuestionTypeLabel(question.type)}
                        {question.concept ? ` · ${question.concept}` : ""}
                    </div>
                    <div className="line-clamp-2 text-sm font-medium">{question.prompt}</div>
                </div>
                {typeof r?.score === "number" && !r.is_correct && r.score > 0 && <Badge variant="secondary">{Math.round(r.score * 100)}%</Badge>}
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 border-t border-border p-4">
                <Markdown content={question.prompt} />
                {!answered && <p className="text-sm text-muted-foreground">{t("review.notAnswered")}</p>}
                <QuestionInput question={question} value={r?.answer ?? {}} onChange={() => undefined} disabled correct={correct} />
                {question.type === "FREE_TEXT" && r?.feedback?.verdict && <EvaluationPanel evaluation={r.feedback} />}
                {(r?.explanation ?? question.explanation) && (
                    <div className="rounded-xl bg-surface p-4 text-sm">
                        <div className="mb-1 font-medium">{t("quiz:player.explanation")}</div>
                        <Markdown content={(r?.explanation ?? question.explanation)!} />
                    </div>
                )}
                <SourceCitation projectId={projectId} source={question.source_ref} />
            </CollapsibleContent>
        </Collapsible>
    );
};
