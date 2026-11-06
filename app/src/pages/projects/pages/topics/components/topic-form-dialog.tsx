import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { topicFormSchema, type TopicFormValues } from "../validation-schemas/topic.schema";

interface TopicFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initial?: Partial<TopicFormValues>;
    pending: boolean;
    onSubmit: (values: TopicFormValues) => void;
}

export const TopicFormDialog = ({ open, onOpenChange, title, initial, pending, onSubmit }: TopicFormDialogProps) => {
    const { t } = useTranslation("topics");
    const form = useForm<TopicFormValues>({ resolver: zodResolver(topicFormSchema), defaultValues: { name: "", description: "" } });
    useEffect(() => {
        if (open) form.reset({ name: initial?.name ?? "", description: initial?.description ?? "" });
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
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.name")}</FormLabel>
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
