import { useEffect, useMemo, useState } from "react";
import { LessonSelect } from "@/pages/projects/components/lesson-select";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, RotateCcw, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Routes } from "@/routes/routes";
import { useCreateQuiz, useProjectDocumentOptions } from "@/features/quizzes/hooks/use-quizzes";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import { QuizModes, type CreateQuizDto, type QuizDifficulty, type QuizMode, type ReviewConfig, type ReviewStrategy } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { QuestionTypes, type QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { QuestionTypeFormOptions } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { QuizDifficultyFormOptions } from "@/config/constants/dropdowns/quizzes/quiz-difficulty-form.options";
import { getQuizModeDescription } from "@/config/constants/dropdowns/quizzes/quiz-mode-form.options";
import { ReviewStrategyFormOptions } from "@/config/constants/dropdowns/quizzes/review-strategy-form.options";
import { ChipMultiSelect } from "./chip-multi-select";

export interface CreateQuizDefaults {
    mode?: QuizMode;
    topic_ids?: string[];
    review?: ReviewConfig;
    title?: string;
}

interface CreateQuizDialogProps {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaults?: CreateQuizDefaults;
    canShare?: boolean;
    /** Navigate straight into the player once created (it waits for generation). */
    startImmediately?: boolean;
}

const DEFAULT_TYPES: QuestionType[] = [QuestionTypes.MCQ, QuestionTypes.TRUE_FALSE, QuestionTypes.FILL_BLANK, QuestionTypes.MATCHING];
const DIALOG_MODES: QuizMode[] = [QuizModes.PRACTICE, QuizModes.ADAPTIVE, QuizModes.REVIEW];
const MODE_ICONS: Record<string, typeof Sparkles> = {
    PRACTICE: Sparkles,
    ADAPTIVE: Brain,
    REVIEW: RotateCcw,
};

/** Creates practice / adaptive / mistake-review quizzes. Exam simulations live on the Exam page. */
export const CreateQuizDialog = ({ projectId, open, onOpenChange, defaults, canShare, startImmediately = true }: CreateQuizDialogProps) => {
    const { t } = useTranslation("quiz");
    const navigate = useNavigate();
    const create = useCreateQuiz(projectId);
    const { flat: topics } = useFlatTopics(projectId);
    const documents = useProjectDocumentOptions(projectId);

    const [mode, setMode] = useState<QuizMode>(defaults?.mode ?? QuizModes.PRACTICE);
    const [title, setTitle] = useState(defaults?.title ?? "");
    const [count, setCount] = useState(10);
    const [types, setTypes] = useState<QuestionType[]>(DEFAULT_TYPES);
    const [difficulty, setDifficulty] = useState<QuizDifficulty>("mixed");
    const [topicIds, setTopicIds] = useState<string[]>(defaults?.topic_ids ?? []);
    const [documentIds, setDocumentIds] = useState<string[]>([]);
    const [strategy, setStrategy] = useState<ReviewStrategy>(defaults?.review?.strategy ?? "new_questions");
    const [shared, setShared] = useState(false);
    const [lessonId, setLessonId] = useState<string | undefined>();

    useEffect(() => {
        if (!open) return;
        setMode(defaults?.mode ?? QuizModes.PRACTICE);
        setTopicIds(defaults?.topic_ids ?? []);
        setStrategy(defaults?.review?.strategy ?? "new_questions");
        setTitle(defaults?.title ?? "");
        setLessonId(undefined);
    }, [open, defaults]);

    const readyDocs = useMemo(() => (documents.data ?? []).filter((d) => d.status === "READY"), [documents.data]);

    const submit = () => {
        const dto: CreateQuizDto = {
            mode,
            title: title.trim() || undefined,
            count,
            types,
            difficulty: mode === QuizModes.ADAPTIVE ? "adaptive" : difficulty,
            shared: canShare ? shared : undefined,
            lesson_id: lessonId,
        };
        if (mode === QuizModes.REVIEW) {
            dto.review = defaults?.review ? { ...defaults.review, strategy } : { source: topicIds.length === 1 ? "topic" : "all_incorrect", topic_id: topicIds.length === 1 ? topicIds[0] : undefined, strategy };
        } else {
            dto.topic_ids = topicIds.length ? topicIds : undefined;
            dto.document_ids = documentIds.length ? documentIds : undefined;
        }
        create.mutate(dto, {
            onSuccess: (quiz) => {
                onOpenChange(false);
                if (startImmediately) navigate(Routes.projects.quiz_take(projectId, quiz.id));
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{t("create.title")}</DialogTitle>
                    <DialogDescription>{getQuizModeDescription(mode)}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    <Tabs value={mode} onValueChange={(v) => setMode(v as QuizMode)}>
                        <TabsList className="grid w-full grid-cols-3">
                            {DIALOG_MODES.map((m) => {
                                const Icon = MODE_ICONS[m];
                                return (
                                    <TabsTrigger key={m} value={m} className="gap-1.5">
                                        <Icon className="h-4 w-4" aria-hidden /> {t(`create.tabs.${m}`)}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>

                    <LessonSelect projectId={projectId} value={lessonId} onChange={setLessonId} />

                    <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                        <div className="space-y-1.5">
                            <Label htmlFor="quiz-title">{t("create.titleLabel")}</Label>
                            <Input id="quiz-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder={t("create.titlePlaceholder")} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="quiz-count">{t("create.count")}</Label>
                            <Input id="quiz-count" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
                        </div>
                    </div>

                    {mode === QuizModes.REVIEW && (
                        <div className="space-y-2">
                            <Label>{t("create.strategy")}</Label>
                            <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as ReviewStrategy)} className="space-y-2">
                                {ReviewStrategyFormOptions.map((o) => (
                                    <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary">
                                        <RadioGroupItem value={o.id} className="mt-0.5" />
                                        <span>
                                            <span className="block text-sm font-medium">{o.label}</span>
                                            <span className="block text-xs text-muted-foreground">{o.description}</span>
                                        </span>
                                    </label>
                                ))}
                            </RadioGroup>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>{t("create.types")}</Label>
                        <ChipMultiSelect label={t("create.types")} options={QuestionTypeFormOptions} value={types} onChange={(v) => setTypes(v.length ? v : types)} />
                    </div>

                    {mode === QuizModes.PRACTICE && (
                        <div className="space-y-1.5">
                            <Label>{t("create.difficulty")}</Label>
                            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as QuizDifficulty)}>
                                <SelectTrigger aria-label={t("create.difficulty")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {QuizDifficultyFormOptions.filter((o) => o.id !== "adaptive").map((o) => (
                                        <SelectItem key={o.id} value={o.id}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {(mode !== QuizModes.REVIEW || !defaults?.review) && (
                        <div className="space-y-2">
                            <Label>{mode === QuizModes.REVIEW ? t("create.topicLimit") : t("create.topics")}</Label>
                            <ChipMultiSelect
                                label={t("create.topicsAria")}
                                options={topics.map((topic) => ({ id: topic.id, label: topic.name, depth: topic.depth }))}
                                value={topicIds}
                                onChange={(v) => setTopicIds(mode === QuizModes.REVIEW ? v.slice(-1) : v)}
                                emptyHint={t("create.topicsEmpty")}
                            />
                        </div>
                    )}

                    {mode === QuizModes.PRACTICE && readyDocs.length > 1 && (
                        <div className="space-y-2">
                            <Label>{t("create.documents")}</Label>
                            <ChipMultiSelect label={t("create.documentsAria")} options={readyDocs.map((d) => ({ id: d.id, label: d.filename }))} value={documentIds} onChange={setDocumentIds} />
                        </div>
                    )}

                    {canShare && mode !== QuizModes.REVIEW && (
                        <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                            <span>
                                <span className="block text-sm font-medium">{t("create.share")}</span>
                                <span className="block text-xs text-muted-foreground">{t("create.shareHint")}</span>
                            </span>
                            <Switch checked={shared} onCheckedChange={setShared} aria-label={t("create.share")} />
                        </label>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
                        {t("common:actions.cancel")}
                    </Button>
                    <Button onClick={submit} loading={create.isPending} disabled={!types.length}>
                        <Sparkles /> {t("create.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
