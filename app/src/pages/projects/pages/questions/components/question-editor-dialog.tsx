import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{question ? `Edit question · v${question.version}` : "Add question"}</DialogTitle>
                    <DialogDescription>{question ? "Saving creates a new version; the previous one stays in history." : getQuestionTypeDescription(type)}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
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
                                        <FormLabel>Difficulty</FormLabel>
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
                                    <FormLabel>{type === "TRUE_FALSE" ? "Statement" : "Question"}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder={type === "FILL_BLANK" ? "The powerhouse of the cell is the _____." : "Write the question…"} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(type === "MCQ" || type === "MULTI_SELECT") && (
                            <div className="space-y-2">
                                <FormLabel>Options {type === "MCQ" ? "(mark the one correct answer)" : "(mark all correct answers)"}</FormLabel>
                                {options.fields.map((f, i) => (
                                    <div key={f.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`options.${i}.correct`}
                                            render={({ field }) => (
                                                <Checkbox
                                                    checked={field.value}
                                                    aria-label={`Option ${i + 1} is correct`}
                                                    onCheckedChange={(c) => {
                                                        if (type === "MCQ" && c) options.fields.forEach((_, j) => j !== i && form.setValue(`options.${j}.correct`, false));
                                                        field.onChange(!!c);
                                                    }}
                                                />
                                            )}
                                        />
                                        <Input {...form.register(`options.${i}.text`)} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => options.remove(i)} disabled={options.fields.length <= 2} aria-label="Remove option">
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                                {options.fields.length < 8 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => options.append({ text: "", correct: false })}>
                                        <Plus /> Add option
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
                                        <FormLabel>Correct answer</FormLabel>
                                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                                            <label className="flex items-center gap-2 text-sm">
                                                <RadioGroupItem value="true" /> True
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <RadioGroupItem value="false" /> False
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
                                        <FormLabel>Accepted answers (comma separated, first is canonical)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="mitochondria, mitochondrion" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {type === "MATCHING" && (
                            <div className="space-y-2">
                                <FormLabel>Pairs</FormLabel>
                                {pairs.fields.map((f, i) => (
                                    <div key={f.id} className="flex items-center gap-2">
                                        <Input {...form.register(`pairs.${i}.left`)} placeholder="Term" aria-label={`Pair ${i + 1} left`} />
                                        <span className="text-muted-foreground">→</span>
                                        <Input {...form.register(`pairs.${i}.right`)} placeholder="Definition" aria-label={`Pair ${i + 1} right`} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => pairs.remove(i)} disabled={pairs.fields.length <= 2} aria-label="Remove pair">
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                                {pairs.fields.length < 8 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => pairs.append({ left: "", right: "" })}>
                                        <Plus /> Add pair
                                    </Button>
                                )}
                                {arrayError("pairs") && <p className="text-sm text-destructive">{arrayError("pairs")}</p>}
                            </div>
                        )}

                        {type === "ORDERING" && (
                            <div className="space-y-2">
                                <FormLabel>Items in the correct order</FormLabel>
                                {items.fields.map((f, i) => (
                                    <div key={f.id} className="flex items-center gap-2">
                                        <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                                        <Input {...form.register(`items.${i}.text`)} placeholder={`Step ${i + 1}`} aria-label={`Item ${i + 1}`} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => items.remove(i)} disabled={items.fields.length <= 2} aria-label="Remove item">
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                                {items.fields.length < 10 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => items.append({ text: "" })}>
                                        <Plus /> Add item
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
                                            <FormLabel>Model answer</FormLabel>
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
                                            <FormLabel>Key concepts (comma separated)</FormLabel>
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
                                    <FormLabel>Explanation (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="topic_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Topic</FormLabel>
                                        <Select value={field.value ?? NO_TOPIC} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NO_TOPIC}>No topic</SelectItem>
                                                {topics.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.depth ? "↳ " : ""}
                                                        {t.name}
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
                                        <FormLabel>Concept</FormLabel>
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
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <Input placeholder="chapter-4, key" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={pending}>
                                {question ? "Save new version" : "Add question"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
