import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionTypeFormOptions } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { QuizDifficultyFormOptions } from "@/config/constants/dropdowns/quizzes/quiz-difficulty-form.options";
import type { FlatTopic } from "@/features/topics/interfaces/topics.interfaces";
import type { QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { ChipMultiSelect } from "@/pages/projects/components/quiz/chip-multi-select";
import { examFormSchema, type ExamFormValues } from "../validation-schemas/exam.schema";

interface ExamConfigFormProps {
    topics: FlatTopic[];
    defaultTarget: number;
    pending: boolean;
    onSubmit: (values: ExamFormValues) => void;
}

const numberField = (v: string) => (v === "" ? 0 : Number(v));

export const ExamConfigForm = ({ topics, defaultTarget, pending, onSubmit }: ExamConfigFormProps) => {
    const { t } = useTranslation("exam");
    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examFormSchema),
        defaultValues: {
            title: "",
            count: 20,
            time_limit_min: 30,
            target_score: defaultTarget,
            difficulty: "mixed",
            types: ["MCQ", "TRUE_FALSE", "FILL_BLANK", "FREE_TEXT", "MATCHING", "ORDERING"],
            topic_ids: [],
            randomize: true,
            use_bank: true,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="count"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.count")}</FormLabel>
                                <FormControl>
                                    <Input type="number" min={5} max={60} {...field} onChange={(e) => field.onChange(numberField(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="time_limit_min"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.timeLimit")}</FormLabel>
                                <FormControl>
                                    <Input type="number" min={1} max={600} {...field} onChange={(e) => field.onChange(numberField(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="target_score"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.target")}</FormLabel>
                                <FormControl>
                                    <Input type="number" min={1} max={100} {...field} onChange={(e) => field.onChange(numberField(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.difficulty")}</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger aria-label={t("form.difficulty")}>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {QuizDifficultyFormOptions.filter((o) => o.id !== "adaptive").map((o) => (
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
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.title")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("form.titlePlaceholder")} {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="types"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("form.types")}</FormLabel>
                            <ChipMultiSelect label={t("form.types")} options={QuestionTypeFormOptions} value={field.value as QuestionType[]} onChange={field.onChange} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="topic_ids"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("form.topics")}</FormLabel>
                            <FormDescription>{t("form.topicsHint")}</FormDescription>
                            <ChipMultiSelect
                                label={t("form.topics")}
                                options={topics.map((topic) => ({ id: topic.id, label: topic.name, depth: topic.depth }))}
                                value={field.value}
                                onChange={field.onChange}
                                emptyHint={t("form.topicsEmpty")}
                            />
                        </FormItem>
                    )}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="randomize"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                                <div>
                                    <FormLabel>{t("form.randomize")}</FormLabel>
                                    <FormDescription>{t("form.randomizeHint")}</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="use_bank"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                                <div>
                                    <FormLabel>{t("form.useBank")}</FormLabel>
                                    <FormDescription>{t("form.useBankHint")}</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground">{t("form.conditions")}</p>
                    <Button type="submit" loading={pending} size="lg">
                        <GraduationCap /> {t("form.start")}
                    </Button>
                </div>
            </form>
        </Form>
    );
};
