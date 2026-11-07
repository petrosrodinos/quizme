import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, FolderInput, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import {
    useCreateLesson,
    useCreateUnit,
    useCurriculum,
    useDeleteLesson,
    useDeleteUnit,
    useReorderCurriculum,
    useUpdateLesson,
    useUpdateUnit,
} from "@/features/curriculum/hooks/use-curriculum";
import type { CurriculumLesson, CurriculumUnit, LessonCounts, ReorderPayload } from "@/features/curriculum/interfaces/curriculum.interfaces";
import { CurriculumFormDialog, type CurriculumFormValues } from "./components/curriculum-form-dialog";
import { LessonSheet } from "./components/lesson-sheet";
import { SortableList, SortableRow } from "./components/sortable";

type FormState =
    | { kind: "unit-create" }
    | { kind: "unit-edit"; unit: CurriculumUnit }
    | { kind: "lesson-create"; unit: CurriculumUnit }
    | { kind: "lesson-edit"; lesson: CurriculumLesson }
    | null;

type DeleteState = { kind: "unit"; unit: CurriculumUnit } | { kind: "lesson"; lesson: CurriculumLesson } | null;

const toPayload = (units: CurriculumUnit[]): ReorderPayload => ({ units: units.map((u) => ({ id: u.id, lesson_ids: u.lessons.map((l) => l.id) })) });

const swap = <T,>(list: T[], i: number, j: number) => {
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
};

export default function ProjectCurriculumPage() {
    const { t } = useTranslation("curriculum");
    usePageMetadata({ title: t("page.title") });
    const { projectId, can } = useProjectContext();
    const { data, isPending } = useCurriculum(projectId);
    const createUnit = useCreateUnit(projectId);
    const updateUnit = useUpdateUnit();
    const deleteUnit = useDeleteUnit();
    const createLesson = useCreateLesson();
    const updateLesson = useUpdateLesson();
    const deleteLesson = useDeleteLesson();
    const reorder = useReorderCurriculum(projectId);
    const [formState, setFormState] = useState<FormState>(null);
    const [toDelete, setToDelete] = useState<DeleteState>(null);
    const [openLesson, setOpenLesson] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const units = data?.units ?? [];
    const unsortedTotal = Object.values(data?.unsorted ?? {}).reduce((a, b) => a + b, 0);
    const busy = reorder.isPending;

    const toggle = (id: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const moveUnit = (index: number, dir: -1 | 1) => reorder.mutate(toPayload(swap(units, index, index + dir)));
    const moveLesson = (unit: CurriculumUnit, index: number, dir: -1 | 1) =>
        reorder.mutate(toPayload(units.map((u) => (u.id === unit.id ? { ...u, lessons: swap(u.lessons, index, index + dir) } : u))));
    const moveLessonToUnit = (lesson: CurriculumLesson, target: CurriculumUnit) =>
        reorder.mutate(
            toPayload(
                units.map((u) => {
                    if (u.id === lesson.unit_id) return { ...u, lessons: u.lessons.filter((l) => l.id !== lesson.id) };
                    if (u.id === target.id) return { ...u, lessons: [...u.lessons, lesson] };
                    return u;
                }),
            ),
        );

    const submitForm = (values: CurriculumFormValues) => {
        if (!formState) return;
        const done = { onSuccess: () => setFormState(null) };
        const dto = { title: values.title, description: values.description || undefined };
        switch (formState.kind) {
            case "unit-create":
                return createUnit.mutate(dto, done);
            case "unit-edit":
                return updateUnit.mutate({ id: formState.unit.id, dto: { title: values.title, description: values.description ?? "" } }, done);
            case "lesson-create":
                return createLesson.mutate({ unitId: formState.unit.id, dto }, done);
            case "lesson-edit":
                return updateLesson.mutate({ id: formState.lesson.id, dto: { title: values.title, description: values.description ?? "" } }, done);
        }
    };

    const formTitle = () => {
        switch (formState?.kind) {
            case "unit-create":
                return t("form.addUnit");
            case "unit-edit":
                return t("form.renameUnit");
            case "lesson-create":
                return t("form.addLesson", { name: formState.unit.title });
            case "lesson-edit":
                return t("form.renameLesson");
            default:
                return "";
        }
    };
    const formInitial = formState?.kind === "unit-edit" ? formState.unit : formState?.kind === "lesson-edit" ? formState.lesson : undefined;

    const confirmDelete = () => {
        if (!toDelete) return;
        const done = { onSuccess: () => setToDelete(null) };
        if (toDelete.kind === "unit") deleteUnit.mutate(toDelete.unit.id, done);
        else deleteLesson.mutate(toDelete.lesson.id, done);
    };

    const countBadges = (counts: LessonCounts) => {
        const parts = [
            counts.documents ? t("counts.documents", { count: counts.documents }) : null,
            counts.quizzes ? t("counts.quizzes", { count: counts.quizzes }) : null,
            counts.decks ? t("counts.decks", { count: counts.decks }) : null,
        ].filter(Boolean) as string[];
        return parts.length ? parts : [t("counts.empty")];
    };

    return (
        <Main width="wide">
            <PageHeader
                title={t("page.title")}
                description={t("page.description")}
                actions={
                    can.edit && (
                        <Button onClick={() => setFormState({ kind: "unit-create" })}>
                            <Plus /> {t("page.addUnit")}
                        </Button>
                    )
                }
            />

            {isPending ? (
                <ListSkeleton rows={5} />
            ) : (
                <div className="space-y-4">
                    {!units.length ? (
                        <EmptyState
                            icon={BookOpen}
                            title={t("empty.title")}
                            description={t("empty.description")}
                            action={
                                can.edit && (
                                    <Button onClick={() => setFormState({ kind: "unit-create" })}>
                                        <Plus /> {t("empty.action")}
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <SortableList items={units} disabled={!can.edit || busy} onReorder={(ordered) => reorder.mutate(toPayload(ordered))}>
                        {units.map((unit, ui) => {
                            const isCollapsed = collapsed.has(unit.id);
                            return (
                                <SortableRow key={unit.id} id={unit.id} as="section" disabled={!can.edit || busy} className="rounded-2xl border border-border bg-surface/50">
                                  {(unitHandle) => (
                                  <>
                                    <header className="flex items-start gap-1 p-3 sm:p-4">
                                        {unitHandle}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="mt-0.5 h-8 w-8 shrink-0"
                                            aria-expanded={!isCollapsed}
                                            aria-label={t(isCollapsed ? "unit.expand" : "unit.collapse", { name: unit.title })}
                                            onClick={() => toggle(unit.id)}
                                        >
                                            {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                                        </Button>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("unit.label", { number: ui + 1 })}</p>
                                            <h2 className="font-display text-lg leading-tight">{unit.title}</h2>
                                            {unit.description && <p className="mt-1 text-sm text-muted-foreground">{unit.description}</p>}
                                            <p className="mt-1 text-xs text-muted-foreground">{t("unit.lessons", { count: unit.lessons.length })}</p>
                                        </div>
                                        {can.edit && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t("unit.actionsFor", { name: unit.title })}>
                                                        <MoreHorizontal />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => setFormState({ kind: "lesson-create", unit })}>
                                                        <Plus /> {t("unit.addLesson")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setFormState({ kind: "unit-edit", unit })}>
                                                        <Pencil /> {t("common:actions.edit")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem disabled={ui === 0 || busy} onSelect={() => moveUnit(ui, -1)}>
                                                        <ArrowUp /> {t("unit.moveUp")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem disabled={ui === units.length - 1 || busy} onSelect={() => moveUnit(ui, 1)}>
                                                        <ArrowDown /> {t("unit.moveDown")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete({ kind: "unit", unit })}>
                                                        <Trash2 /> {t("common:actions.delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </header>

                                    {!isCollapsed && (
                                        <div className="space-y-2 border-t border-border p-3 sm:p-4">
                                            {!unit.lessons.length && <p className="text-sm text-muted-foreground">{t("unit.noLessons")}</p>}
                                            <SortableList
                                                items={unit.lessons}
                                                disabled={!can.edit || busy}
                                                onReorder={(ordered) => reorder.mutate(toPayload(units.map((u) => (u.id === unit.id ? { ...u, lessons: ordered } : u))))}
                                            >
                                            {unit.lessons.map((lesson, li) => (
                                                <SortableRow key={lesson.id} id={lesson.id} disabled={!can.edit || busy} className="flex items-center gap-1 rounded-xl border border-border bg-background px-2 py-2">
                                                  {(lessonHandle) => (
                                                  <>
                                                    {lessonHandle}
                                                    <button
                                                        type="button"
                                                        className="min-w-0 flex-1 text-left"
                                                        aria-label={t("lesson.open", { name: lesson.title })}
                                                        onClick={() => setOpenLesson(lesson.id)}
                                                    >
                                                        <p className="text-xs text-muted-foreground">{t("lesson.label", { number: li + 1 })}</p>
                                                        <p className="truncate font-medium">{lesson.title}</p>
                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                            {countBadges(lesson.counts).map((label) => (
                                                                <Badge key={label} variant="secondary">
                                                                    {label}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </button>
                                                    {can.edit && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t("lesson.actionsFor", { name: lesson.title })}>
                                                                    <MoreHorizontal />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => setFormState({ kind: "lesson-edit", lesson })}>
                                                                    <Pencil /> {t("common:actions.edit")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem disabled={li === 0 || busy} onSelect={() => moveLesson(unit, li, -1)}>
                                                                    <ArrowUp /> {t("lesson.moveUp")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem disabled={li === unit.lessons.length - 1 || busy} onSelect={() => moveLesson(unit, li, 1)}>
                                                                    <ArrowDown /> {t("lesson.moveDown")}
                                                                </DropdownMenuItem>
                                                                {units
                                                                    .filter((u) => u.id !== unit.id)
                                                                    .map((target) => (
                                                                        <DropdownMenuItem key={target.id} disabled={busy} onSelect={() => moveLessonToUnit(lesson, target)}>
                                                                            <FolderInput /> {t("lesson.moveTo", { name: target.title })}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete({ kind: "lesson", lesson })}>
                                                                    <Trash2 /> {t("common:actions.delete")}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                  </>
                                                  )}
                                                </SortableRow>
                                            ))}
                                            </SortableList>
                                            {can.edit && (
                                                <Button variant="outline" size="sm" onClick={() => setFormState({ kind: "lesson-create", unit })}>
                                                    <Plus /> {t("unit.addLesson")}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                  </>
                                  )}
                                </SortableRow>
                            );
                        })}
                        </SortableList>
                    )}

                    {units.length > 0 && (
                        <div className="rounded-2xl border border-dashed border-border p-3 sm:p-4">
                            <h2 className="text-sm font-medium">{t("unsorted.title")}</h2>
                            <p className="text-sm text-muted-foreground">{unsortedTotal ? t("unsorted.description") : t("unsorted.none")}</p>
                            {unsortedTotal > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {data && data.unsorted.document > 0 && <Badge variant="secondary">{t("counts.documents", { count: data.unsorted.document })}</Badge>}
                                    {data && data.unsorted.quiz > 0 && <Badge variant="secondary">{t("counts.quizzes", { count: data.unsorted.quiz })}</Badge>}
                                    {data && data.unsorted.deck > 0 && <Badge variant="secondary">{t("counts.decks", { count: data.unsorted.deck })}</Badge>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <CurriculumFormDialog
                open={!!formState}
                onOpenChange={(o) => !o && setFormState(null)}
                title={formTitle()}
                initial={formInitial ? { title: formInitial.title, description: formInitial.description ?? "" } : undefined}
                pending={createUnit.isPending || updateUnit.isPending || createLesson.isPending || updateLesson.isPending}
                onSubmit={submitForm}
            />
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                title={toDelete?.kind === "unit" ? t("delete.unitTitle", { name: toDelete.unit.title }) : t("delete.lessonTitle", { name: toDelete?.lesson.title ?? "" })}
                description={toDelete?.kind === "unit" ? t("delete.unitDescription") : t("delete.lessonDescription")}
                confirmText={t("common:actions.delete")}
                variant="destructive"
                isLoading={deleteUnit.isPending || deleteLesson.isPending}
            />
            <LessonSheet projectId={projectId} lessonId={openLesson} canEdit={can.edit} onOpenChange={(o) => !o && setOpenLesson(null)} />
        </Main>
    );
}
