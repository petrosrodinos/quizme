import { useEffect, useRef, useState } from "react";
import { Brain, History, Mic, MicOff, Presentation, Send, Sparkles } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useFeedback } from "@/hooks/use-feedback";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import { useEvaluateRecall, useGenerateRecallPrompts, useRecallHistory } from "@/features/recall/hooks/use-recall";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import { RecallModes, type RecallAttempt, type RecallMode, type RecallPrompt, type RecallResult } from "@/features/recall/interfaces/recall.interfaces";
import { RecallModeFormOptions, getRecallModeLabel } from "@/config/constants/dropdowns/recall/recall-mode.options";
import { EvaluationResult } from "./components/evaluation-result";
import { useSpeechRecognition } from "./hooks/use-speech-recognition";
import { useTranslation } from "react-i18next";

const ANY = "any";
const FREE = "free";

export default function ProjectRecallPage() {
    const { t } = useTranslation("recall");
    usePageMetadata({ title: t("page.title") });
    const { projectId } = useProjectContext();
    const { flat: topics } = useFlatTopics(projectId);
    const { data: history = [], isPending: historyPending } = useRecallHistory(projectId);
    const generate = useGenerateRecallPrompts();
    const evaluate = useEvaluateRecall();
    const { play } = useFeedback();

    const [mode, setMode] = useState<RecallMode>(RecallModes.ACTIVE_RECALL);
    const [topicId, setTopicId] = useState<string>(ANY);
    const [prompts, setPrompts] = useState<RecallPrompt[]>([]);
    const [index, setIndex] = useState(0);
    const [source, setSource] = useState<"generated" | typeof FREE>("generated");
    const [freePrompt, setFreePrompt] = useState("");
    const [answer, setAnswer] = useState("");
    const [result, setResult] = useState<RecallResult | null>(null);
    const [viewing, setViewing] = useState<RecallAttempt | null>(null);
    const startedAt = useRef(Date.now());

    const speech = useSpeechRecognition((text) => setAnswer((a) => (a ? `${a} ${text}` : text)));
    const current = source === "generated" ? prompts[index] : null;
    const promptText = source === "generated" ? current?.prompt : freePrompt.trim();

    useEffect(() => {
        startedAt.current = Date.now();
    }, [index, source, prompts]);

    const getPrompts = () =>
        generate.mutate(
            { projectId, mode, topic_id: topicId === ANY ? undefined : topicId, count: 5 },
            {
                onSuccess: (p) => {
                    setPrompts(p);
                    setIndex(0);
                    setResult(null);
                    setAnswer("");
                    setSource("generated");
                },
            },
        );

    const submit = () => {
        if (!answer.trim() || !promptText) return;
        if (speech.listening) speech.stop();
        evaluate.mutate(
            {
                projectId,
                dto: {
                    mode,
                    prompt_id: current?.prompt_id,
                    prompt: current ? undefined : promptText,
                    answer: answer.trim(),
                    topic_id: current?.topic_id ?? (topicId === ANY ? undefined : topicId),
                    time_spent_sec: Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000)),
                },
            },
            {
                onSuccess: (r) => {
                    setResult(r);
                    play(r.evaluation.score >= 80 ? "finishPass" : r.evaluation.score >= 40 ? "correct" : "wrong");
                },
            },
        );
    };

    const next = () => {
        setResult(null);
        setAnswer("");
        if (source === "generated" && index < prompts.length - 1) setIndex((i) => i + 1);
        else if (source === FREE) setFreePrompt("");
    };

    return (
        <Main width="wide">
            <PageHeader
                title={t("page.title")}
                description={t("page.description")}
            />

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                    <section aria-label={t("page.modeGroup")} className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                        {RecallModeFormOptions.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                role="radio"
                                aria-checked={mode === o.id}
                                onClick={() => {
                                    setMode(o.id);
                                    setPrompts([]);
                                    setResult(null);
                                }}
                                className={cn(
                                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    mode === o.id ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/40",
                                )}
                            >
                                {o.id === RecallModes.TEACH_BACK ? <Presentation className="mt-0.5 h-5 w-5 text-primary" aria-hidden /> : <Brain className="mt-0.5 h-5 w-5 text-primary" aria-hidden />}
                                <span>
                                    <span className="block font-medium">{o.label}</span>
                                    <span className="text-sm text-muted-foreground">{o.description}</span>
                                </span>
                            </button>
                        ))}
                    </section>

                    <Tabs value={source} onValueChange={(v) => setSource(v as "generated" | typeof FREE)}>
                        <TabsList>
                            <TabsTrigger value="generated">{t("source.generated")}</TabsTrigger>
                            <TabsTrigger value={FREE}>{t("source.free")}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="generated" className="mt-3">
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="recall-topic">{t("source.topic")}</Label>
                                    <Select value={topicId} onValueChange={setTopicId}>
                                        <SelectTrigger id="recall-topic" className="w-56">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ANY}>{t("source.anyTopic")}</SelectItem>
                                            {topics.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.depth ? "↳ " : ""}
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={getPrompts} loading={generate.isPending}>
                                    <Sparkles /> {prompts.length ? t("source.newPrompts") : t("source.getPrompts")}
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value={FREE} className="mt-3 space-y-1">
                            <Label htmlFor="free-prompt">{t("source.freeLabel")}</Label>
                            <Input id="free-prompt" value={freePrompt} onChange={(e) => setFreePrompt(e.target.value)} maxLength={500} placeholder={t("source.freePlaceholder")} />
                        </TabsContent>
                    </Tabs>

                    {source === "generated" && generate.isPending ? (
                        <Skeleton className="h-64 w-full rounded-xl" />
                    ) : !promptText ? (
                        <EmptyState
                            icon={Brain}
                            title={source === "generated" ? t("empty.generatedTitle") : t("empty.freeTitle")}
                            description={t("empty.description")}
                            compact
                        />
                    ) : (
                        <section aria-label={t("answer.ariaLabel")} className="rounded-xl border border-border bg-card p-5">
                            {source === "generated" && prompts.length > 1 && (
                                <p className="mb-2 text-xs text-muted-foreground">
                                    {t("answer.promptCounter", { current: index + 1, total: prompts.length })}
                                </p>
                            )}
                            <h2 className="font-display text-2xl">{promptText}</h2>
                            {current?.source?.document_title && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {current.source.page
                                        ? t("answer.fromSourcePage", { title: current.source.document_title, page: current.source.page })
                                        : t("answer.fromSource", { title: current.source.document_title })}
                                </p>
                            )}

                            {result ? (
                                <div className="mt-5 border-t border-border pt-5">
                                    <EvaluationResult evaluation={result.evaluation} sources={result.sources} projectId={projectId} />
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Button variant="outline" onClick={() => setResult(null)}>
                                            {t("common:actions.tryAgain")}
                                        </Button>
                                        {(source === FREE || index < prompts.length - 1) && <Button onClick={next}>{source === FREE ? t("answer.another") : t("answer.nextPrompt")}</Button>}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-2">
                                    <Label htmlFor="recall-answer" className="sr-only">
                                        {t("answer.label")}
                                    </Label>
                                    <Textarea
                                        id="recall-answer"
                                        rows={8}
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        maxLength={8000}
                                        placeholder={mode === RecallModes.TEACH_BACK ? t("answer.teachBackPlaceholder") : t("answer.placeholder")}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                                        }}
                                    />
                                    {speech.listening && speech.interim && <p className="text-sm italic text-muted-foreground" aria-live="polite">{speech.interim}…</p>}
                                    {speech.error && <p className="text-sm text-destructive">{speech.error}</p>}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {speech.supported ? (
                                            <Button type="button" variant={speech.listening ? "destructive" : "outline"} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening}>
                                                {speech.listening ? <MicOff /> : <Mic />}
                                                {speech.listening ? t("speech.stop") : t("speech.start")}
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{t("speech.unsupported")}</span>
                                        )}
                                        <span className="ml-auto text-xs text-muted-foreground">{t("answer.submitHint")}</span>
                                        <Button onClick={submit} loading={evaluate.isPending} disabled={!answer.trim()}>
                                            <Send /> {t("answer.evaluate")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <aside aria-label={t("history.title")}>
                    <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <History className="h-4 w-4" aria-hidden /> {t("history.title")}
                    </h2>
                    {historyPending ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : !history.length ? (
                        <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {history.map((h) => (
                                <li key={h.id}>
                                    <button
                                        type="button"
                                        onClick={() => setViewing(h)}
                                        className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <Badge variant="outline">{getRecallModeLabel(h.mode)}</Badge>
                                            <span className={cn("font-display text-lg", h.score >= 80 ? "text-success" : h.score >= 40 ? "text-amber" : "text-destructive")}>{h.score}</span>
                                        </span>
                                        <span className="mt-1 line-clamp-2 block text-sm">{h.prompt}</span>
                                        <span className="text-xs text-muted-foreground">{formatRelative(h.created_at)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>

            <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl font-normal">{viewing?.prompt}</DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <>
                            <blockquote className="whitespace-pre-wrap border-l-2 border-border pl-3 text-sm text-muted-foreground">{viewing.answer}</blockquote>
                            <EvaluationResult evaluation={viewing.evaluation} projectId={projectId} />
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Main>
    );
}
