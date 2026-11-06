import { useEffect, useState } from "react";
import { Database, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { useDeleteQuestion, useQuestions, useUpdateQuestion } from "@/features/questions/hooks/use-questions";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import type { ContentOrigin, Question, QuestionQuery, QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { QuestionTypeFilterOptions } from "@/config/constants/dropdowns/quizzes/question-type-filter.options";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { QuestionDifficultyFilterOptions, QuestionDifficultyFormOptions } from "@/config/constants/dropdowns/quizzes/question-difficulty-form.options";
import { QuestionOriginFilterOptions, getQuestionOriginLabel } from "@/config/constants/dropdowns/quizzes/question-origin-filter.options";
import { QuestionEditorDialog } from "./components/question-editor-dialog";
import { QuestionPreviewSheet } from "./components/question-preview-sheet";

const ALL = "all";

export default function ProjectQuestionsPage() {
    usePageMetadata({ title: "Question bank" });
    const { projectId, can } = useProjectContext();
    const { flat: topics } = useFlatTopics(projectId);
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [query, setQuery] = useState<QuestionQuery>({ page: 1, limit: 20 });
    const { data, isPending, isFetching } = useQuestions(projectId, { ...query, search: debounced || undefined });
    const update = useUpdateQuestion();
    const remove = useDeleteQuestion();
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<Question | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<Question | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebounced(search.trim());
            setQuery((q) => ({ ...q, page: 1 }));
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const setFilter = <K extends keyof QuestionQuery>(key: K, value: QuestionQuery[K] | undefined) => setQuery((q) => ({ ...q, [key]: value, page: 1 }));

    const openEditor = (q: Question | null) => {
        setEditing(q);
        setPreviewId(null);
        setEditorOpen(true);
    };

    const pagination = data?.pagination;

    return (
        <Main width="wide">
            <PageHeader
                title="Question bank"
                description="Every generated or hand-written question, with its source, topic and your stats. Edits are versioned."
                actions={
                    can.contribute && (
                        <Button onClick={() => openEditor(null)}>
                            <Plus /> Add question
                        </Button>
                    )
                }
            />

            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions or concepts…" className="pl-9" aria-label="Search questions" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={query.type ?? ALL} onValueChange={(v) => setFilter("type", v === ALL ? undefined : (v as QuestionType))}>
                        <SelectTrigger className="w-40" aria-label="Filter by type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {QuestionTypeFilterOptions.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={query.difficulty ? String(query.difficulty) : ALL} onValueChange={(v) => setFilter("difficulty", v === ALL ? undefined : Number(v))}>
                        <SelectTrigger className="w-36" aria-label="Filter by difficulty">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {QuestionDifficultyFilterOptions.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={query.topic_id ?? ALL} onValueChange={(v) => setFilter("topic_id", v === ALL ? undefined : v)}>
                        <SelectTrigger className="w-44" aria-label="Filter by topic">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All topics</SelectItem>
                            {topics.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.depth ? "↳ " : ""}
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={query.origin ?? ALL} onValueChange={(v) => setFilter("origin", v === ALL ? undefined : (v as ContentOrigin))}>
                        <SelectTrigger className="w-36" aria-label="Filter by source">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {QuestionOriginFilterOptions.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        className="w-28"
                        placeholder="#tag"
                        aria-label="Filter by tag"
                        value={query.tag ?? ""}
                        onChange={(e) => setFilter("tag", e.target.value.replace(/^#/, "").trim().toLowerCase() || undefined)}
                    />
                    <div className="flex items-center gap-2 px-1">
                        <Switch id="missed-only" checked={!!query.missed} onCheckedChange={(v) => setFilter("missed", v || undefined)} />
                        <Label htmlFor="missed-only" className="text-sm">
                            Missed by me
                        </Label>
                    </div>
                </div>
            </div>

            {isPending ? (
                <ListSkeleton rows={8} />
            ) : !data?.data.length ? (
                <EmptyState
                    icon={Database}
                    title="No questions found"
                    description="Questions appear here as you generate quizzes, or add your own."
                    action={
                        can.contribute && (
                            <Button onClick={() => openEditor(null)}>
                                <Plus /> Add question
                            </Button>
                        )
                    }
                />
            ) : (
                <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                        {data.data.map((q) => {
                            const total = (q.my_stats?.correct ?? 0) + (q.my_stats?.incorrect ?? 0);
                            return (
                                <li key={q.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                    <button type="button" className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setPreviewId(q.id)}>
                                        <div className="line-clamp-2 text-sm font-medium">{q.prompt}</div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="font-normal">
                                                {getQuestionTypeLabel(q.type)}
                                            </Badge>
                                            <span>{q.topic?.name ?? "No topic"}</span>
                                            {q.concept && <span>· {q.concept}</span>}
                                            <span>· {getQuestionOriginLabel(q.origin)}</span>
                                            {q.version > 1 && <span>· v{q.version}</span>}
                                            {q.tags.map((t) => (
                                                <span key={t} className="text-primary">
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right text-xs text-muted-foreground" title="Your results on this question">
                                            {total ? (
                                                <>
                                                    <span className="text-success">{q.my_stats?.correct}</span> / <span className="text-destructive">{q.my_stats?.incorrect}</span>
                                                </>
                                            ) : (
                                                "unseen"
                                            )}
                                        </div>
                                        {can.edit ? (
                                            <Select value={String(q.difficulty)} onValueChange={(v) => update.mutate({ id: q.id, dto: { difficulty: Number(v) } })}>
                                                <SelectTrigger className="h-8 w-32 text-xs" aria-label="Change difficulty">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {QuestionDifficultyFormOptions.map((o) => (
                                                        <SelectItem key={o.id} value={o.id}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="outline">{q.difficulty}/5</Badge>
                                        )}
                                        {can.edit && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Question actions">
                                                        <MoreHorizontal />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setPreviewId(q.id)}>View details</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditor(q)}>
                                                        <Pencil /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(q)}>
                                                        <Trash2 /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {pagination && pagination.total_pages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {pagination.total} questions · page {pagination.page} of {pagination.total_pages}
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={!pagination.has_prev} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}>
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <QuestionEditorDialog projectId={projectId} open={editorOpen} onOpenChange={setEditorOpen} question={editing} topics={topics} />
            <QuestionPreviewSheet projectId={projectId} questionId={previewId} canEdit={can.edit} onClose={() => setPreviewId(null)} onEdit={(q) => openEditor(q)} />
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title="Delete this question?"
                description="Questions with existing answers are archived so your history stays intact."
                confirmText="Delete"
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
