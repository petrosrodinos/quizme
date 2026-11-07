import type { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUpdateProject } from "@/features/projects/hooks/use-projects";
import type { ProjectHeader } from "@/features/projects/interfaces/project-header.interfaces";
import { planSettingsSchema, type PlanSettingsFormValues } from "../validation-schemas/plan-settings.schema";
import { useTranslation } from "react-i18next";

interface PlanSettingsFormProps {
    project: ProjectHeader;
    defaults: { minutes: number; days: number };
    onSaved: () => void;
}

/** Inline editor for the goals that drive the plan (exam date, target, daily minutes, days per week). */
export const PlanSettingsForm: FC<PlanSettingsFormProps> = ({ project, defaults, onSaved }) => {
    const { t } = useTranslation("plan");
    const update = useUpdateProject();
    const form = useForm<PlanSettingsFormValues>({
        resolver: zodResolver(planSettingsSchema) as never,
        defaultValues: {
            exam_date: project.exam_date ? project.exam_date.slice(0, 10) : "",
            target_score: project.target_score,
            daily_minutes_goal: project.daily_minutes_goal ?? defaults.minutes,
            weekly_days_target: project.weekly_days_target ?? defaults.days,
        },
    });
    const submit = (v: PlanSettingsFormValues) =>
        update.mutate(
            {
                id: project.id,
                dto: {
                    exam_date: v.exam_date ? v.exam_date : null,
                    target_score: v.target_score,
                    daily_minutes_goal: v.daily_minutes_goal,
                    weekly_days_target: v.weekly_days_target,
                },
            },
            { onSuccess: onSaved },
        );
    const fields: { name: keyof PlanSettingsFormValues; label: string; type: string; min?: number; max?: number }[] = [
        { name: "exam_date", label: t("form.examDate"), type: "date" },
        { name: "target_score", label: t("form.targetScore"), type: "number", min: 1, max: 100 },
        { name: "daily_minutes_goal", label: t("form.minutesPerDay"), type: "number", min: 5, max: 480 },
        { name: "weekly_days_target", label: t("form.daysPerWeek"), type: "number", min: 1, max: 7 },
    ];
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {fields.map((f) => (
                    <FormField
                        key={f.name}
                        control={form.control}
                        name={f.name}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{f.label}</FormLabel>
                                <FormControl>
                                    <Input type={f.type} min={f.min} max={f.max} {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
                <div className="sm:col-span-2 lg:col-span-4">
                    <Button type="submit" loading={update.isPending}>
                        {t("form.submit")}
                    </Button>
                </div>
            </form>
        </Form>
    );
};
