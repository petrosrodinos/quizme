import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Brain, FileText, HelpCircle, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/routes";
import { useAssignItems, useLesson, useUnassignItems } from "@/features/curriculum/hooks/use-curriculum";
import type { LessonItemType } from "@/features/curriculum/interfaces/curriculum.interfaces";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { useQuizzes } from "@/features/quizzes/hooks/use-quizzes";
import { useDecks } from "@/features/flashcards/hooks/use-flashcards";

interface Props {
    projectId: string;
    lessonId: string | null;
    canEdit: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Pickable {
    id: string;
    label: string;
    lesson_id?: string | null;
}

/** Lesson contents (documents, quizzes, decks) with add/remove. Items live in one lesson at most; adding moves them. */
export const LessonSheet = ({ projectId, lessonId, canEdit, onOpenChange }: Props) => {
    const { t } = useTranslation("curriculum");
    const { data: lesson, isPending } = useLesson(lessonId ?? undefined);
    const { data: documents } = useDocuments(lessonId ? projectId : undefined);
    const { data: quizzes } = useQuizzes(lessonId ? projectId : "");
    const { data: decks } = useDecks(lessonId ? projectId : "");
    const assign = useAssignItems();
    const unassign = useUnassignItems(projectId);
    const [resetKey, setResetKey] = useState(0);

    const options = useMemo(
        () => ({
            document: (documents ?? []).map<Pickable>((d) => ({ id: d.id, label: d.filename, lesson_id: d.lesson_id })),
            quiz: (quizzes ?? []).map<Pickable>((q) => ({ id: q.id, label: q.title, lesson_id: q.lesson_id })),
            deck: (decks ?? []).map<Pickable>((d) => ({ id: d.id, label: d.name, lesson_id: d.lesson_id })),
        }),
        [documents, quizzes, decks],
    );

    const sections: { type: Extract<LessonItemType, "document" | "quiz" | "deck">; title: string; icon: typeof FileText; placeholder: string; items: { id: string; label: string; href: string }[] }[] = [
        {
            type: "document",
            title: t("types.documents"),
            icon: FileText,
            placeholder: t("sheet.pickDocument"),
            items: (lesson?.documents ?? []).map((d) => ({ id: d.id, label: d.filename, href: Routes.projects.document(projectId, d.id) })),
        },
        {
            type: "quiz",
            title: t("types.quizzes"),
            icon: HelpCircle,
            placeholder: t("sheet.pickQuiz"),
            items: (lesson?.quizzes ?? []).map((q) => ({ id: q.id, label: q.title, href: Routes.projects.quizzes(projectId) })),
        },
        {
            type: "deck",
            title: t("types.decks"),
            icon: Brain,
            placeholder: t("sheet.pickDeck"),
            items: (lesson?.decks ?? []).map((d) => ({ id: d.id, label: d.name, href: Routes.projects.flashcards(projectId) })),
        },
    ];

    const add = (type: LessonItemType, id: string) => {
        if (!lessonId) return;
        assign.mutate({ lessonId, type, ids: [id] }, { onSettled: () => setResetKey((k) => k + 1) });
    };

    return (
        <Sheet open={!!lessonId} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="font-display text-xl font-normal">{lesson?.title ?? "…"}</SheetTitle>
                    {lesson?.description && <SheetDescription>{lesson.description}</SheetDescription>}
                </SheetHeader>
                {isPending ? (
                    <div className="space-y-3 px-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <div className="space-y-6 px-4 pb-6">
                        {sections.map(({ type, title, icon: Icon, placeholder, items }) => {
                            const available = options[type].filter((o) => o.lesson_id !== lessonId);
                            return (
                                <section key={type} className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-sm font-medium">
                                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> {title}
                                    </h3>
                                    {items.length === 0 && <p className="text-sm text-muted-foreground">{t("sheet.empty")}</p>}
                                    <ul className="space-y-1">
                                        {items.map((item) => (
                                            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                                                <Link to={item.href} className="min-w-0 flex-1 truncate hover:underline">
                                                    {item.label}
                                                </Link>
                                                {canEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0"
                                                        aria-label={t("sheet.removeItem", { name: item.label })}
                                                        onClick={() => unassign.mutate({ type, ids: [item.id] })}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    {canEdit && (
                                        <Select key={`${type}-${resetKey}`} onValueChange={(id) => add(type, id)} disabled={assign.isPending || available.length === 0}>
                                            <SelectTrigger aria-label={placeholder}>
                                                <SelectValue placeholder={available.length ? placeholder : t("sheet.noneToAdd")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {available.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                        {o.lesson_id ? ` · ${t("sheet.otherLesson")}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};
