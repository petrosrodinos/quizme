import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Deck } from "@/features/flashcards/interfaces/flashcards.interfaces";
import type { FlatTopic } from "@/features/topics/interfaces/topics.interfaces";
import type { StudyDocument } from "@/features/documents/interfaces/documents.interfaces";
import type { GenerateFlashcardsDto } from "@/features/flashcards/services/flashcard-generation.services";
import { ChipMultiSelect } from "@/pages/projects/components/quiz/chip-multi-select";
import { generateFlashcardsSchema, type GenerateFlashcardsFormValues } from "../validation-schemas/flashcard.schema";
import { useTranslation } from "react-i18next";

const NONE = "none";

interface GenerateFlashcardsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    decks: Deck[];
    topics: FlatTopic[];
    documents: StudyDocument[];
    defaultDeckId?: string;
    isPending?: boolean;
    onSubmit: (dto: GenerateFlashcardsDto) => void;
}

export const GenerateFlashcardsDialog = ({ open, onOpenChange, decks, topics, documents, defaultDeckId, isPending, onSubmit }: GenerateFlashcardsDialogProps) => {
    const { t } = useTranslation("flashcards");
    const form = useForm<GenerateFlashcardsFormValues>({
        resolver: zodResolver(generateFlashcardsSchema) as unknown as Resolver<GenerateFlashcardsFormValues>,
        defaultValues: { count: 15, deck_id: defaultDeckId, document_ids: [], topic_ids: [], instructions: "" },
    });

    useEffect(() => {
        if (open) form.reset({ count: 15, deck_id: defaultDeckId, document_ids: [], topic_ids: [], instructions: "" });
    }, [open, defaultDeckId, form]);

    const readyDocs = documents.filter((d) => d.status === "READY");

    const submit = (v: GenerateFlashcardsFormValues) =>
        onSubmit({
            count: v.count,
            deck_id: v.deck_id || undefined,
            document_ids: v.document_ids.length ? v.document_ids : undefined,
            topic_ids: v.topic_ids.length ? v.topic_ids : undefined,
            instructions: v.instructions?.trim() || undefined,
        });

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{t("generate.title")}</DialogTitle>
                    <DialogDescription>{t("generate.description")}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="count"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("generate.fields.count")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={60} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="deck_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("generate.fields.deck")}</FormLabel>
                                        <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
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
                        </div>
                        <FormField
                            control={form.control}
                            name="document_ids"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("generate.fields.documents")}</FormLabel>
                                    <ChipMultiSelect
                                        label={t("common:terms.documents")}
                                        options={readyDocs.map((d) => ({ id: d.id, label: d.filename }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        emptyHint={t("generate.fields.documentsEmpty")}
                                    />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="topic_ids"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("generate.fields.topics")}</FormLabel>
                                    <ChipMultiSelect
                                        label={t("common:terms.topics")}
                                        options={topics.map((t) => ({ id: t.id, label: t.name, depth: t.depth }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        emptyHint={t("generate.fields.topicsEmpty")}
                                    />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="instructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("generate.fields.instructions")}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} placeholder={t("generate.fields.instructionsPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={isPending} disabled={!readyDocs.length}>
                                <Sparkles /> {t("common:actions.generate")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
