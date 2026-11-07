import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/ui/markdown";
import { QuestionDifficultyFormOptions } from "@/config/constants/dropdowns/quizzes/question-difficulty-form.options";
import type { Deck, Flashcard, FlashcardDto } from "@/features/flashcards/interfaces/flashcards.interfaces";
import type { FlatTopic } from "@/features/topics/interfaces/topics.interfaces";
import { TagsInput } from "@/pages/projects/components/tags-input";
import { flashcardFormSchema, type FlashcardFormValues } from "../validation-schemas/flashcard.schema";
import { useTranslation } from "react-i18next";

const NONE = "none";

interface FlashcardEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    card: Flashcard | null;
    decks: Deck[];
    topics: FlatTopic[];
    defaultDeckId?: string;
    isPending?: boolean;
    onSubmit: (dto: FlashcardDto) => void;
}

const toDefaults = (card: Flashcard | null, deckId?: string): FlashcardFormValues => ({
    front: card?.front ?? "",
    back: card?.back ?? "",
    deck_id: card?.deck_id ?? deckId ?? undefined,
    topic_id: card?.topic_id ?? undefined,
    tags: card?.tags ?? [],
    category: card?.category ?? "",
    difficulty: card?.difficulty ?? 2,
});

export const FlashcardEditorDialog = ({ open, onOpenChange, card, decks, topics, defaultDeckId, isPending, onSubmit }: FlashcardEditorDialogProps) => {
    const { t } = useTranslation("flashcards");
    const form = useForm<FlashcardFormValues>({
        resolver: zodResolver(flashcardFormSchema) as unknown as Resolver<FlashcardFormValues>,
        defaultValues: toDefaults(card, defaultDeckId),
    });
    const [preview, setPreview] = useState<"edit" | "preview">("edit");

    useEffect(() => {
        if (open) {
            form.reset(toDefaults(card, defaultDeckId));
            setPreview("edit");
        }
    }, [open, card, defaultDeckId, form]);

    const submit = (v: FlashcardFormValues) =>
        onSubmit({
            front: v.front.trim(),
            back: v.back.trim(),
            deck_id: v.deck_id || undefined,
            topic_id: v.topic_id || undefined,
            tags: v.tags,
            category: v.category?.trim() || undefined,
            difficulty: v.difficulty,
        });

    const front = form.watch("front");
    const back = form.watch("back");

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{card ? t("editor.editTitle") : t("editor.newTitle")}</DialogTitle>
                    <DialogDescription>{t("editor.description")}</DialogDescription>
                </DialogHeader>
                <Tabs value={preview} onValueChange={(v) => setPreview(v as "edit" | "preview")}>
                    <TabsList>
                        <TabsTrigger value="edit">{t("editor.write")}</TabsTrigger>
                        <TabsTrigger value="preview">{t("editor.preview")}</TabsTrigger>
                    </TabsList>
                </Tabs>
                {preview === "preview" ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card p-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("card.front")}</p>
                            <Markdown content={front || `*${t("editor.empty")}*`} />
                        </div>
                        <div className="rounded-xl border border-border bg-surface-card p-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("card.back")}</p>
                            <Markdown content={back || `*${t("editor.empty")}*`} />
                        </div>
                    </div>
                ) : null}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                        <div className={preview === "preview" ? "hidden" : "space-y-4"}>
                            <FormField
                                control={form.control}
                                name="front"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.front")}</FormLabel>
                                        <FormControl>
                                            <Textarea rows={3} autoFocus placeholder={t("editor.fields.frontPlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="back"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.back")}</FormLabel>
                                        <FormControl>
                                            <Textarea rows={4} placeholder={t("editor.fields.backPlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="deck_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.deck")}</FormLabel>
                                        <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("generate.fields.defaultDeck")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>{t("generate.fields.defaultDeck")}</SelectItem>
                                                {decks.map((d) => (
                                                    <SelectItem key={d.id} value={d.id}>
                                                        {d.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="topic_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.topic")}</FormLabel>
                                        <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("editor.fields.noTopic")} />
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
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("common:terms.difficulty")}</FormLabel>
                                        <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {QuestionDifficultyFormOptions.map((o) => (
                                                    <SelectItem key={o.id} value={String(o.id)}>
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
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("editor.fields.category")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("editor.fields.categoryPlaceholder")} {...field} />
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
                                    <FormLabel>{t("editor.fields.tags")}</FormLabel>
                                    <TagsInput value={field.value} onChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={isPending}>
                                {card ? t("common:actions.saveChanges") : t("editor.addCard")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
