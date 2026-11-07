import { ExternalLink, FileText, Layers, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { formatNumber, formatPercent, tCount } from "@/lib/format";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import type { SharedView } from "@/features/shares/interfaces/shares.interfaces";
import { useTranslation } from "react-i18next";

/** Read-only rendering of shared content, per resource type. */
export const SharedContent = ({ view }: { view: SharedView }) => {
    const { t } = useTranslation("shared");
    switch (view.resource_type) {
        case "PROJECT": {
            const c = view.content;
            return (
                <div className="space-y-5">
                    {c.description ? <p className="text-muted-foreground">{c.description}</p> : null}
                    <dl className="grid grid-cols-3 gap-3">
                        {[
                            { label: t("content.documents"), value: c.counts.documents },
                            { label: t("content.questions"), value: c.counts.questions },
                            { label: t("content.flashcards"), value: c.counts.flashcards },
                        ].map((s) => (
                            <div key={s.label} className="rounded-lg bg-surface-card p-3 text-center">
                                <dd className="font-display text-2xl">{formatNumber(s.value)}</dd>
                                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                            </div>
                        ))}
                    </dl>
                    {c.topics.length ? (
                        <div>
                            <h3 className="mb-2 text-sm font-medium">{t("content.topics")}</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {c.topics.map((topic) => (
                                    <Badge key={topic} variant="secondary">
                                        {topic}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        }
        case "DECK":
            return (
                <div className="space-y-3">
                    {view.content.description ? <p className="text-muted-foreground">{view.content.description}</p> : null}
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Layers className="h-4 w-4" aria-hidden /> {tCount("card", view.content.cards.length)}
                    </p>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {view.content.cards.map((card, i) => (
                            <li key={i} className="rounded-xl border border-border bg-card p-4">
                                <p className="font-medium">{card.front}</p>
                                <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">{card.back}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        case "QUIZ":
            return (
                <div className="space-y-3">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ListChecks className="h-4 w-4" aria-hidden /> {t("content.quizInfo", { questions: tCount("question", view.content.questions.length) })}
                    </p>
                    <ol className="space-y-2">
                        {view.content.questions.map((q, i) => (
                            <li key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                                <span className="font-display text-lg text-muted-foreground">{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm">{q.prompt}</p>
                                    <Badge variant="outline" className="mt-1.5">
                                        {getQuestionTypeLabel(q.type)}
                                    </Badge>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            );
        case "NOTE":
            return (
                <article className="space-y-3">
                    {view.content.selection_text ? <blockquote className="border-l-2 border-primary pl-3 text-muted-foreground">{view.content.selection_text}</blockquote> : null}
                    <Markdown content={view.content.content || `_${t("content.emptyNote")}_`} />
                </article>
            );
        case "DOCUMENT": {
            const c = view.content;
            return (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
                        <FileText className="h-6 w-6 text-primary" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{c.filename}</p>
                            <p className="text-sm text-muted-foreground">
                                {c.file_type}
                                {c.page_count ? ` · ${tCount("page", c.page_count)}` : ""}
                                {c.word_count ? ` · ${t("content.words", { count: c.word_count, formatted: formatNumber(c.word_count) })}` : ""}
                            </p>
                        </div>
                        <Button variant="outline" asChild>
                            <a href={c.view_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" /> {t("content.openOriginal")}
                            </a>
                        </Button>
                    </div>
                    {c.summary ? (
                        <div className="rounded-xl border border-border bg-card p-5">
                            <h3 className="mb-3 font-display text-lg">{t("content.summary")}</h3>
                            <Markdown content={c.summary} />
                        </div>
                    ) : null}
                </div>
            );
        }
        case "STUDY_PLAN": {
            const plan = view.content.plan;
            if (!plan) return <p className="text-muted-foreground">{t("content.planMissing")}</p>;
            return (
                <div className="space-y-4">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-surface-card p-3">
                            <dt className="text-xs text-muted-foreground">{t("content.daysRemaining")}</dt>
                            <dd className="font-display text-2xl">{plan.days_remaining ?? "—"}</dd>
                        </div>
                        <div className="rounded-lg bg-surface-card p-3">
                            <dt className="text-xs text-muted-foreground">{t("content.minutesPerDay")}</dt>
                            <dd className="font-display text-2xl">{plan.recommended?.minutes_per_day ?? "—"}</dd>
                        </div>
                        <div className="rounded-lg bg-surface-card p-3">
                            <dt className="text-xs text-muted-foreground">{t("content.daysPerWeek")}</dt>
                            <dd className="font-display text-2xl">{plan.recommended?.days_per_week ?? "—"}</dd>
                        </div>
                        <div className="rounded-lg bg-surface-card p-3">
                            <dt className="text-xs text-muted-foreground">{t("content.target")}</dt>
                            <dd className="font-display text-2xl">{plan.target_score ? formatPercent(plan.target_score) : "—"}</dd>
                        </div>
                    </dl>
                    {plan.priority_topics?.length ? (
                        <div>
                            <h3 className="mb-2 text-sm font-medium">{t("content.priorityTopics")}</h3>
                            <ol className="list-decimal space-y-1 pl-5 text-sm">
                                {plan.priority_topics.map((topic) => (
                                    <li key={topic.id}>
                                        {topic.name} <span className="text-muted-foreground">{t("content.mastery", { value: topic.mastery })}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ) : null}
                    {plan.advice?.length ? (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {plan.advice.map((a) => (
                                <li key={a}>{a}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            );
        }
    }
};
