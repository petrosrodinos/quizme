import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/ui/markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoteTypeFormOptions } from "@/config/constants/dropdowns/notes/note-type.options";
import { HighlightColorOptions } from "@/config/constants/dropdowns/notes/highlight-color.options";
import type { NoteWithRelations } from "@/features/notes/interfaces/notes.interfaces";
import type { FlatTopic } from "@/features/topics/interfaces/topics.interfaces";
import { TagsInput } from "@/pages/projects/components/tags-input";
import { noteFormSchema, type NoteFormValues } from "../validation-schemas/note.schema";
import { useTranslation } from "react-i18next";

const NONE = "none";

interface NoteEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    note: NoteWithRelations | null;
    topics: FlatTopic[];
    canShare: boolean;
    isPending?: boolean;
    onSubmit: (values: NoteFormValues) => void;
}

const toDefaults = (n: NoteWithRelations | null): NoteFormValues => ({
    type: n?.type ?? "NOTE",
    title: n?.title ?? "",
    content: n?.content ?? "",
    tags: n?.tags ?? [],
    color: n?.color ?? undefined,
    topic_id: n?.topic_id ?? undefined,
    is_shared: n?.is_shared ?? false,
});

export const NoteEditorDialog = ({ open, onOpenChange, note, topics, canShare, isPending, onSubmit }: NoteEditorDialogProps) => {
    const { t } = useTranslation("notes");
    const form = useForm<NoteFormValues>({ resolver: zodResolver(noteFormSchema), defaultValues: toDefaults(note) });
    const [tab, setTab] = useState<"write" | "preview">("write");

    useEffect(() => {
        if (open) {
            form.reset(toDefaults(note));
            setTab("write");
        }
    }, [open, note, form]);

    const content = form.watch("content");

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{note ? t("editor.editTitle") : t("editor.newTitle")}</DialogTitle>
                    <DialogDescription>{t("editor.description")}</DialogDescription>
                </DialogHeader>
                {note?.selection_text && (
                    <blockquote className="border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground">{note.selection_text}</blockquote>
                )}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.title")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("editor.fields.titlePlaceholder")} autoFocus {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.type")}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {NoteTypeFormOptions.map((o) => (
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
                        <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
                            <TabsList>
                                <TabsTrigger value="write">{t("editor.write")}</TabsTrigger>
                                <TabsTrigger value="preview">{t("editor.preview")}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {tab === "preview" ? (
                            <div className="min-h-48 rounded-lg border border-border bg-card p-4">
                                <Markdown content={content || `*${t("editor.emptyPreview")}*`} />
                            </div>
                        ) : (
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="sr-only">{t("editor.fields.content")}</FormLabel>
                                        <FormControl>
                                            <Textarea rows={10} className="font-mono text-sm" placeholder={t("editor.fields.contentPlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="topic_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.topic")}</FormLabel>
                                        <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>{t("editor.fields.noTopic")}</SelectItem>
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
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.color")}</FormLabel>
                                        <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>{t("editor.fields.noColor")}</SelectItem>
                                                {HighlightColorOptions.map((o) => (
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
                            name="tags"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("editor.fields.tags")}</FormLabel>
                                    <TagsInput value={field.value} onChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                        {canShare && (
                            <FormField
                                control={form.control}
                                name="is_shared"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                                        <div>
                                            <FormLabel>{t("editor.fields.share")}</FormLabel>
                                            <p className="text-xs text-muted-foreground">{t("editor.fields.shareHint")}</p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={isPending}>
                                {note ? t("common:actions.saveChanges") : t("editor.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
