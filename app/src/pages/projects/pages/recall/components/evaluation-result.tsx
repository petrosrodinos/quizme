import { Link } from "react-router-dom";
import { AlertCircle, BookOpen, CheckCircle2, ChevronDown, Lightbulb, XCircle } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Markdown } from "@/components/ui/markdown";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import type { Evaluation } from "@/features/recall/interfaces/recall.interfaces";
import type { SourceRef } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { getRecallVerdictLabel } from "@/config/constants/dropdowns/recall/recall-mode.options";
import { useTranslation } from "react-i18next";

const Bar = ({ label, value }: { label: string; value: number }) => (
    <div>
        <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium tabular-nums">{value}%</span>
        </div>
        <Progress value={value} className="h-2" aria-label={`${label} ${value}%`} />
    </div>
);

const verdictTone = { correct: "text-success", partially_correct: "text-amber", incorrect: "text-destructive" } as const;

/** Structured feedback for an active-recall / teach-back answer. */
export const EvaluationResult = ({ evaluation, sources = [], projectId }: { evaluation: Evaluation; sources?: SourceRef[]; projectId: string }) => {
    const { t } = useTranslation("recall");
    return (
    <div className="space-y-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
            <ProgressRing value={evaluation.score} size={112} indicatorClassName={evaluation.score >= 80 ? "stroke-success" : evaluation.score >= 40 ? "stroke-amber" : "stroke-destructive"}>
                <span className="font-display text-3xl">{evaluation.score}</span>
            </ProgressRing>
            <div className="w-full flex-1 space-y-3">
                <p className={cn("flex items-center gap-1.5 font-medium", verdictTone[evaluation.verdict])}>
                    {evaluation.verdict === "correct" ? <CheckCircle2 className="h-4 w-4" /> : evaluation.verdict === "incorrect" ? <XCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {getRecallVerdictLabel(evaluation.verdict)}
                </p>
                <Bar label={t("evaluation.accuracy")} value={evaluation.accuracy} />
                <Bar label={t("evaluation.completeness")} value={evaluation.completeness} />
                {evaluation.clarity !== null && <Bar label={t("evaluation.clarity")} value={evaluation.clarity} />}
            </div>
        </div>

        {evaluation.explanation && <p className="text-sm">{evaluation.explanation}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("evaluation.covered")}</h4>
                <div className="flex flex-wrap gap-1.5">
                    {evaluation.mentioned_concepts.length ? (
                        evaluation.mentioned_concepts.map((c) => (
                            <span key={c} className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs text-success">
                                {c}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </div>
            </div>
            <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("evaluation.missing")}</h4>
                <div className="flex flex-wrap gap-1.5">
                    {evaluation.missing_concepts.length ? (
                        evaluation.missing_concepts.map((c) => (
                            <span key={c} className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive">
                                {c}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground">{t("evaluation.nothingMissing")}</span>
                    )}
                </div>
            </div>
        </div>

        {evaluation.incorrect_statements.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <h4 className="mb-1 text-sm font-medium text-destructive">{t("evaluation.incorrect")}</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                    {evaluation.incorrect_statements.map((s) => (
                        <li key={s}>{s}</li>
                    ))}
                </ul>
            </div>
        )}

        {evaluation.suggestions.length > 0 && (
            <div className="rounded-lg bg-surface p-3">
                <h4 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-amber" aria-hidden /> {t("evaluation.improve")}
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                    {evaluation.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                    ))}
                </ul>
            </div>
        )}

        <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                {t("evaluation.showExpected")} <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-lg border border-border p-3 text-sm">
                <Markdown content={evaluation.expected_answer} />
            </CollapsibleContent>
        </Collapsible>

        {sources.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
                {sources.map((s) => (
                    <Link key={s.chunk_id} to={Routes.projects.document(projectId, s.document_id)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <BookOpen className="h-3 w-3" aria-hidden />
                        {s.document_title}
                        {s.page ? `, ${t("evaluation.pageShort", { page: s.page })}` : ""}
                    </Link>
                ))}
            </div>
        )}
    </div>
    );
};
