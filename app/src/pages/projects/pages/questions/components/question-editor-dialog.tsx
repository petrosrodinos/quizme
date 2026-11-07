import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionTypeFormOptions, getQuestionTypeDescription } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { QuestionDifficultyFormOptions } from "@/config/constants/dropdowns/quizzes/question-difficulty-form.options";
import { useCreateQuestion, useUpdateQuestion } from "@/features/questions/hooks/use-questions";
import type { CreateQuestionDto, Question, QuestionData, QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import type { FlatTopic } from "@/features/topics/interfaces/topics.interfaces";
import { questionFormSchema, type QuestionFormValues } from "../validation-schemas/question.schema";

interface QuestionEditorDialogProps {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    question?: Question | null;
    topics: FlatTopic[];
}

const NO_TOPIC = "__none";

const toForm = (q?: Question | null): QuestionFormValues => {
    const d: QuestionData = q?.data ?? {};
    const correct = Array.isArray(d.correct) ? d.correct : [];
    return {
        type: q?.type ?? "MCQ",
        prompt: q?.prompt ?? "",
        explanation: q?.explanation ?? "",
        difficulty: String(q?.difficulty ?? 2),
        concept: q?.concept ?? "",
        topic_id: q?.topic_id ?? NO_TOPIC,
        tags: (q?.tags ?? []).join(", "),
        options: d.options?.length ? d.options.map((text, i) => ({ text, correct: correct.includes(i) })) : [0, 1, 2, 3].map(() => ({ text: "", correct: false })),
        tf_correct: d.correct === false ? "false" : "true",
        answers: (d.answers ?? []).join(", "),
        pairs: d.pairs?.length ? d.pairs : [0, 1, 2].map(() => ({ left: "", right: "" })),
        items: d.items?.length ? d.items.map((text) => ({ text })) : [0, 1, 2].map(() => ({ text: "" })),
        expected_answer: d.expected_answer ?? "",
        key_concepts: (d.key_concepts ?? []).join(", "),
    };
};

const split = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const toDto = (v: QuestionFormValues): CreateQuestionDto => {
    const type = v.type as QuestionType;
    let data: QuestionData = {};
    if (type === "MCQ" || type === "MULTI_SELECT") {
        const filled = v.options.filter((o) => o.text.trim());
        data = { options: filled.map((o) => o.text.trim()), correct: filled.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0) };
    } else if (type === "TRUE_FALSE") data = { correct: v.tf_correct === "true" };
    else if (type === "FILL_BLANK") data = { answers: split(v.answers) };
    else if (type === "MATCHING") data = { pairs: v.pairs.filter((p) => p.left.trim() && p.right.trim()).map((p) => ({ left: p.left.trim(), right: p.right.trim() })) };
    else if (type === "ORDERING") data = { items: v.items.map((i) => i.text.trim()).filter(Boolean) };
    else data = { expected_answer: v.expected_answer?.trim(), key_concepts: split(v.key_concepts) };
    return {
        type,
        prompt: v.prompt.trim(),
        data,
        explanation: v.explanation?.trim() || undefined,
        difficulty: Number(v.difficulty),
        concept: v.concept?.trim() || undefined,
        topic_id: v.topic_id && v.topic_id !== NO_TOPIC ? v.topic_id : undefined,
        tags: split(v.tags).map((t) => t.toLowerCase()),
    };
};

/** Create or edit a question of any type. Edits are versioned server-side. */
export const QuestionEditorDialog = ({ projectId, open, onOpenChange, question, topics }: QuestionEditorDialogProps) => {
    const { t } = useTranslation("questions");
    const create = useCreateQuestion(projectId);
    const update = useUpdateQuestion();
    const form = useForm<QuestionFormValues>({ resolver: zodResolver(questionFormSchema), defaultValues: toForm(question) });
    const options = useFieldArray({ control: form.control, name: "options" });
    const pairs = useFieldArray({ control: form.control, name: "pairs" });
    const items = useFieldArray({ control: form.control, name: "items" });
    const type = form.watch("type") as QuestionType;
    const pending = create.isPending || update.isPending;

    useEffect(() => {
        if (open) form.reset(toForm(question));
    }, [open, question, form]);

    const onSubmit = (values: QuestionFormValues) => {
        const dto = toDto(values);
        const done = { onSuccess: () => onOpenChange(false) };
        if (question) update.mutate({ id: question.id, dto }, done);
        else create.mutate(dto, done);
    };

    const arrayError = (name: "options" | "pairs" | "items") => {
        const e = form.formState.errors[name] as { message?: string; root?: { message?: string } } | undefined;
        return e?.message ?? e?.root?.message;
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{question ? t("editor.editTitle", { version: question.version }) : t("page.add")}</DialogTitle>
                    <DialogDescription>{question ? t("editor.editDescription") : getQuestionTypeDescription(type)}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.type")}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {QuestionTypeFormOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.difficulty")}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {QuestionDifficultyFormOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="prompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{type === "TRUE_FALSE" ? t("editor.statement") : t("editor.question")}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder={type === "FILL_BLANK" ? t("editor.blankPlaceholder") : t("editor.questionPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(type === "MCQ" || type === "MULTI_SELECT") && (
                            <div className="space-y-2">
                                <FormLabel>{type === "MCQ" ? t("editor.optionsSingle") : t("editor.optionsMulti")}</FormLabel>
                                {options.fields.map((f, i) => (
                                    <div key={f.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`options.${i}.correct`}
                                            render={({ field }) => (
                                                <Checkbox
                                                    checked={field.value}
                                                    aria-label={t("editor.optionCorrect", { number: i + 1 })}
                                                    onCheckedChange={(c) => {
                                                        if (type === "MCQ" && c) options.fields.forEach((_, j) => j !== i && form.setValue(`options.${j}.correct`, false));
                                                        field.onChange(!!c);
                                                    }}
                                                />
                                            )}
                                        />
                                        <Input {...form.register(`options.${i}.text`)} placeholder={t("editor.option", { number: i + 1 })} aria-label={t("editor.option", { number: i + 1 })} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => options.remove(i)} disabled={options.fields.length <= 2} aria-label={t("editor.removeOption")}>
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                                {options.fields.length < 8 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => options.append({ text: "", correct: false })}>
                                        <Plus /> {t("editor.addOption")}
                                    </Button>
                                )}
                                {arrayError("options") && <p className="text-sm text-destructive">{arrayError("options")}</p>}
                            </div>
                        )}

                        {type === "TRUE_FALSE" && (
                            <FormField
                                control={form.control}
                                name="tf_correct"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.correctAnswer")}</FormLabel>
                                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                                            <label className="flex items-center gap-2 text-sm">
                                                <RadioGroupItem value="true" /> {t("quiz:inputs.true")}
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <RadioGroupItem value="false" /> {t("quiz:inputs.false")}
                                            </label>
                                        </RadioGroup>
                                    </FormItem>
                                )}
                            />
                        )}

                        {type === "FILL_BLANK" && (
                            <FormField
                                control={form.control}
                                name="answers"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.acceptedAnswers")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("editor.acceptedPlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {type === "MATCHING" && (
                            <div className="space-y-2">
                                <FormLabel>{t("editor.pairs")}</FormLabel>
                                {pairs.fields.map((f, i) => (
                                    <div key={f.id} className="flex items-center gap-2">
                                        <Input {...form.register(`pairs.${i}.left`)} placeholder={t("editor.term")} aria-label={t("editor.pairLeft", { number: i + 1 })} />
                                        <span className="text-muted-foreground">→</span>
                                        <Input {...form.register(`pairs.${i}.right`)} placeholder={t("editor.definition")} aria-label={t("editor.pairRight", { number: i + 1 })} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => pairs.remove(i)} disabled={pairs.fields.length <= 2} aria-label={t("editor.removePair")}>
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                                {pairs.fields.length < 8 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => pairs.append({ left: "", right: "" })}>
                                        <Plus /> {t("editor.addPair")}
                                    </Button>
                                )}
                                {arrayError("pairs") && <p className="text-sm text-destructive">{arrayError("pairs")}</p>}
                            </div>
                        )}

                        {type === "ORDERING" && (
                            <div className="space-y-2">
                                <FormLabel>{t("editor.itemsOrder")}</FormLabel>
                                {items.fields.map((f, i) => (
                                    <div key={f.id} className="flex items-center gap-2">
                                        <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                                        <Input {...form.register(`items.${i}.text`)} placeholder={t("editor.step", { number: i + 1 })} aria-label={t("editor.item", { number: i + 1 })} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => items.remove(i)} disabled={items.fields.length <= 2} aria-label={t("editor.removeItem")}>
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                                {items.fields.length < 10 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => items.append({ text: "" })}>
                                        <Plus /> {t("editor.addItem")}
                                    </Button>
                                )}
                                {arrayError("items") && <p className="text-sm text-destructive">{arrayError("items")}</p>}
                            </div>
                        )}

                        {type === "FREE_TEXT" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="expected_answer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("editor.modelAnswer")}</FormLabel>
                                            <FormControl>
                                                <Textarea rows={3} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="key_concepts"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("editor.keyConcepts")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="explanation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("editor.explanation")}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="topic_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.topic")}</FormLabel>
                                        <Select value={field.value ?? NO_TOPIC} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NO_TOPIC}>{t("list.noTopic")}</SelectItem>
                                                {topics.map((topic) => (
                                                    <SelectItem key={topic.id} value={topic.id}>
                                                        {topic.depth ? "↳ " : ""}
                                                        {topic.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="concept"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.concept")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.tags")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("editor.tagsPlaceholder")} {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={pending}>
                                {question ? t("editor.saveVersion") : t("page.add")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
