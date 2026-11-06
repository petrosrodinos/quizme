import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectDifficultyFormOptions } from "@/config/constants/dropdowns/projects/project-difficulty-form.options";
import { ProjectStatusFormOptions } from "@/config/constants/dropdowns/projects/project-status-form.options";
import type { CreateProjectDto, Project } from "@/features/projects/interfaces/projects.interfaces";
import { projectFormSchema, type ProjectFormValues } from "../validation-schemas/project.schema";
import { TagsInput } from "./tags-input";
import { useTranslation } from "react-i18next";

interface ProjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: Project | null;
    isPending?: boolean;
    onSubmit: (dto: CreateProjectDto) => void;
}

const toDefaults = (p?: Project | null): ProjectFormValues => ({
    title: p?.title ?? "",
    description: p?.description ?? "",
    subject: p?.subject ?? "",
    exam_date: p?.exam_date ? p.exam_date.slice(0, 10) : "",
    target_score: p?.target_score ?? 80,
    difficulty: p?.difficulty ?? "INTERMEDIATE",
    status: p?.status ?? "NOT_STARTED",
    tags: p?.tags ?? [],
    daily_minutes_goal: p?.daily_minutes_goal ?? 30,
    weekly_days_target: p?.weekly_days_target ?? 5,
});

export const ProjectFormDialog = ({ open, onOpenChange, project, isPending, onSubmit }: ProjectFormDialogProps) => {
    const { t } = useTranslation("projects");
    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectFormSchema) as unknown as Resolver<ProjectFormValues>,
        defaultValues: toDefaults(project),
    });

    useEffect(() => {
        if (open) form.reset(toDefaults(project));
    }, [open, project, form]);

    const submit = (v: ProjectFormValues) =>
        onSubmit({
            title: v.title.trim(),
            description: v.description?.trim() || undefined,
            subject: v.subject?.trim() || undefined,
            exam_date: v.exam_date ? new Date(`${v.exam_date}T09:00:00`).toISOString() : null,
            target_score: v.target_score,
            difficulty: v.difficulty,
            status: v.status,
            tags: v.tags,
            daily_minutes_goal: v.daily_minutes_goal,
            weekly_days_target: v.weekly_days_target,
        });

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{project ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
                    <DialogDescription>{t("form.description")}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.fields.title")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("form.fields.titlePlaceholder")} autoFocus {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.subject")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("form.fields.subjectPlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="exam_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.examDate")}</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.fields.description")}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder={t("form.fields.descriptionPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="target_score"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.targetScore")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={100} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.difficulty")}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger aria-label={t("form.fields.difficulty")}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ProjectDifficultyFormOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.status")}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger aria-label={t("form.fields.status")}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ProjectStatusFormOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="daily_minutes_goal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.dailyMinutes")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={5} max={480} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="weekly_days_target"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.fields.weeklyDays")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={7} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="tags"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.fields.tags")}</FormLabel>
                                    <TagsInput value={field.value} onChange={field.onChange} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                {t("form.cancel")}
                            </Button>
                            <Button type="submit" loading={isPending}>
                                {project ? t("form.save") : t("form.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
