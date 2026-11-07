import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { tr } from "@/lib/i18n-options";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
    title: z.string().trim().min(1, { error: () => tr("curriculum:validation.titleRequired") }).max(120, { error: () => tr("common:validation.maxLength", { count: 120 }) }),
    description: z.string().max(1000, { error: () => tr("common:validation.maxLength", { count: 1000 }) }).optional(),
});
export type CurriculumFormValues = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initial?: Partial<CurriculumFormValues>;
    pending: boolean;
    onSubmit: (values: CurriculumFormValues) => void;
}

/** Shared create/edit dialog for units and lessons (both have a title and an optional description). */
export const CurriculumFormDialog = ({ open, onOpenChange, title, initial, pending, onSubmit }: Props) => {
    const { t } = useTranslation("curriculum");
    const form = useForm<CurriculumFormValues>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "" } });
    useEffect(() => {
        if (open) form.reset({ title: initial?.title ?? "", description: initial?.description ?? "" });
    }, [open, initial, form]);
    return (
        <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl font-normal">{title}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.title")}</FormLabel>
                                    <FormControl>
                                        <Input autoFocus {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.description")}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={pending}>
                                {t("common:actions.save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
