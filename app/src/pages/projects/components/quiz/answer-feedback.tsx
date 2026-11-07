import { CheckCircle2, FileText, Lightbulb, XCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Markdown } from "@/components/ui/markdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";
import type { Evaluation } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { SourceRef } from "@/features/questions/interfaces/questions.interfaces";

interface SourceCitationProps {
    projectId: string;
    source: SourceRef | null | undefined;
    className?: string;
}

/** "Source: Biology Chapter 4, page 27" with a link to the document reader. */
export const SourceCitation = ({ projectId, source, className }: SourceCitationProps) => {
    const { t } = useTranslation("quiz");
    if (!source?.document_title) return null;
    const label = [source.document_title, source.section, source.page ? t("source.page", { page: source.page }) : null].filter(Boolean).join(" · ");
    return (
        <div className={cn("rounded-lg border border-border bg-surface/70 p-3 text-sm", className)}>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FileText className="h-3.5 w-3.5" aria-hidden /> {t("source.label")}
            </div>
            {source.document_id ? (
                <Link to={Routes.projects.document(projectId, source.document_id)} className="mt-1 block font-medium text-primary hover:underline">
                    {label}
                </Link>
            ) : (
                <div className="mt-1 font-medium">{label}</div>
            )}
            {source.quote && <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-muted-foreground italic">“{source.quote}”</blockquote>}
        </div>
    );
};

interface EvaluationPanelProps {
    evaluation: Partial<Evaluation>;
}

/** AI grading breakdown for free-text answers. */
export const EvaluationPanel = ({ evaluation }: EvaluationPanelProps) => {
    const { t } = useTranslation("quiz");
    return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t("evaluation.title")}</span>
            {evaluation.verdict && <Badge variant="outline">{t(`evaluation.verdict.${evaluation.verdict}`)}</Badge>}
            {typeof evaluation.score === "number" && <Badge variant="secondary">{evaluation.score}/100</Badge>}
            {typeof evaluation.completeness === "number" && <Badge variant="outline">{t("evaluation.completeness", { value: evaluation.completeness })}</Badge>}
            {typeof evaluation.accuracy === "number" && <Badge variant="outline">{t("evaluation.accuracy", { value: evaluation.accuracy })}</Badge>}
            {typeof evaluation.clarity === "number" && <Badge variant="outline">{t("evaluation.clarity", { value: evaluation.clarity })}</Badge>}
        </div>
        {evaluation.explanation && <p className="text-sm text-muted-foreground">{evaluation.explanation}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!!evaluation.mentioned_concepts?.length && (
                <ConceptList title={t("evaluation.covered")} items={evaluation.mentioned_concepts} tone="success" />
            )}
            {!!evaluation.missing_concepts?.length && <ConceptList title={t("evaluation.missing")} items={evaluation.missing_concepts} tone="warning" />}
        </div>
        {!!evaluation.incorrect_statements?.length && <ConceptList title={t("evaluation.incorrect")} items={evaluation.incorrect_statements} tone="danger" />}
        {evaluation.expected_answer && (
            <div className="text-sm">
                <div className="mb-1 font-medium">{t("evaluation.expected")}</div>
                <Markdown content={evaluation.expected_answer} />
            </div>
        )}
        {!!evaluation.suggestions?.length && (
            <ul className="space-y-1 text-sm">
                {evaluation.suggestions.map((s) => (
                    <li key={s} className="flex gap-2">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
                        {s}
                    </li>
                ))}
            </ul>
        )}
    </div>
    );
};

const toneClasses = { success: "text-success", warning: "text-warning", danger: "text-destructive" };

const ConceptList = ({ title, items, tone }: { title: string; items: string[]; tone: keyof typeof toneClasses }) => (
    <div>
        <div className={cn("mb-1 text-xs font-medium uppercase tracking-wide", toneClasses[tone])}>{title}</div>
        <ul className="space-y-0.5 text-sm">
            {items.map((i) => (
                <li key={i}>• {i}</li>
            ))}
        </ul>
    </div>
);

interface FeedbackBannerProps {
    isCorrect: boolean;
    score?: number;
    previouslyMissed?: boolean;
}

/** Correct / partially / incorrect banner. Visual equivalent of the audio cue. */
export const FeedbackBanner = ({ isCorrect, score, previouslyMissed }: FeedbackBannerProps) => {
    const { t } = useTranslation("quiz");
    const partial = !isCorrect && (score ?? 0) > 0;
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                isCorrect ? "animate-pop bg-success/12 text-success" : partial ? "bg-warning/15 text-warning" : "animate-shake-x bg-destructive/10 text-destructive",
            )}
        >
            {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : partial ? <AlertCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {isCorrect ? (previouslyMissed ? t("feedback.correctFixed") : t("feedback.correct")) : partial ? t("feedback.partial", { percent: Math.round((score ?? 0) * 100) }) : t("feedback.incorrect")}
        </div>
    );
};
