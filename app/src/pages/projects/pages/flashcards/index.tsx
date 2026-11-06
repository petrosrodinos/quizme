import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, MoreHorizontal, Pencil, Play, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { Markdown } from "@/components/ui/markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { ExportMenu } from "@/pages/projects/components/export-menu";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import {
    useCreateDeck,
    useCreateFlashcard,
    useDecks,
    useDeleteDeck,
    useDeleteFlashcard,
    useFlashcards,
    useFlashcardStats,
    useUpdateDeck,
    useUpdateFlashcard,
} from "@/features/flashcards/hooks/use-flashcards";
import { useGenerateFlashcards } from "@/features/flashcards/hooks/use-flashcard-generation";
import { useFlashcardGenerationEvents } from "@/features/flashcards/hooks/use-flashcard-generation-events";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import type { CardStatus, Deck, Flashcard, FlashcardQuery } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { CardStatusFilterOptions, getCardStatusLabel } from "@/config/constants/dropdowns/flashcards/card-status.options";
import { getQuestionDifficultyLabel } from "@/config/constants/dropdowns/quizzes/question-difficulty-form.options";
import { FlashcardStats } from "./components/flashcard-stats";
import { FlashcardEditorDialog } from "./components/flashcard-editor-dialog";
import { GenerateFlashcardsDialog } from "./components/generate-flashcards-dialog";
import { DeckDialog } from "./components/deck-dialog";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/date";

const ALL = "all";
const statusTone: Record<CardStatus, string> = {
    NEW: "bg-muted text-muted-foreground",
    LEARNING: "bg-amber/15 text-amber",
    NEEDS_REVIEW: "bg-destructive/10 text-destructive",
    KNOWN: "bg-success/15 text-success",
};

export default function ProjectFlashcardsPage() {
    const { t } = useTranslation("flashcards");
    usePageMetadata({ title: t("page.title") });
    const { projectId, can } = useProjectContext();
    const navigate = useNavigate();
    useFlashcardGenerationEvents(projectId);
    const { data: decks = [] } = useDecks(projectId);
    const { flat: topics } = useFlatTopics(projectId);
    const { data: documents = [] } = useDocuments(projectId);
    const stats = useFlashcardStats(projectId);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState<FlashcardQuery>({ page: 1, limit: 50 });
    useEffect(() => {
        const timer = setTimeout(() => setQuery((q) => ({ ...q, search: search.trim() || undefined, page: 1 })), 300);
        return () => clearTimeout(timer);
    }, [search]);
    const { data, isPending } = useFlashcards(projectId, query);

    const createCard = useCreateFlashcard();
    const updateCard = useUpdateFlashcard();
    const deleteCard = useDeleteFlashcard();
    const createDeck = useCreateDeck();
    const updateDeck = useUpdateDeck();
    const deleteDeck = useDeleteDeck();
    const generate = useGenerateFlashcards();

    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<Flashcard | null>(null);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [deckDialog, setDeckDialog] = useState<{ open: boolean; deck: Deck | null }>({ open: false, deck: null });
    const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
    const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
    const [revealed, setRevealed] = useState<Set<string>>(new Set());

    const setFilter = <K extends keyof FlashcardQuery>(key: K, value: FlashcardQuery[K] | undefined) => setQuery((q) => ({ ...q, [key]: value, page: 1 }));
    const cards = data?.data ?? [];
    const pagination = data?.pagination;
    const dueCount = stats.data ? stats.data.counts.due + Math.min(stats.data.counts.new, 15) : 0;

    const toggleReveal = (id: string) =>
        setRevealed((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    return (
        <Main width="wide">
            <PageHeader
                title={t("page.title")}
                description={t("page.description")}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <ExportMenu projectId={projectId} type="flashcards" deckId={query.deck_id} />
                        {can.contribute && (
                            <>
                                <Button variant="outline" onClick={() => setGenerateOpen(true)}>
                                    <Sparkles /> {t("actions.generateWithAi")}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditing(null);
                                        setEditorOpen(true);
                                    }}
                                >
                                    <Plus /> {t("actions.newCard")}
                                </Button>
                            </>
                        )}
                        <Button disabled={!dueCount} onClick={() => navigate(Routes.projects.flashcards_review(projectId))}>
                            <Play /> {dueCount ? t("actions.reviewNowCount", { count: dueCount }) : t("actions.reviewNow")}
                        </Button>
                    </div>
                }
            />

            <FlashcardStats stats={stats.data} isPending={stats.isPending} />

            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <aside aria-label={t("decks.title")} className="space-y-1">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-medium text-muted-foreground">{t("decks.title")}</h2>
                        {can.contribute && (
                            <Button size="icon" variant="ghost" aria-label={t("decks.newTitle")} onClick={() => setDeckDialog({ open: true, deck: null })}>
                                <Plus />
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                        <button
                            type="button"
                            onClick={() => setFilter("deck_id", undefined)}
                            className={cn(
                                "flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                !query.deck_id ? "bg-surface-card font-medium" : "hover:bg-muted",
                            )}
                        >
                            {t("decks.allCards")}
                            <span className="text-xs text-muted-foreground">{stats.data?.counts.total ?? ""}</span>
                        </button>
                        {decks.map((d) => (
                            <div
                                key={d.id}
                                className={cn("group flex shrink-0 items-center rounded-md transition-colors", query.deck_id === d.id ? "bg-surface-card" : "hover:bg-muted")}
                            >
                                <button
                                    type="button"
                                    onClick={() => setFilter("deck_id", d.id)}
                                    className="flex flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <span className={cn("truncate", query.deck_id === d.id && "font-medium")}>{d.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {d.due_count ? <span className="text-primary">{t("decks.dueCount", { count: d.due_count })} · </span> : null}
                                        {d.card_count}
                                    </span>
                                </button>
                                {can.edit && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("decks.actionsFor", { name: d.name })}>
                                                <MoreHorizontal />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => setDeckDialog({ open: true, deck: d })}>
                                                <Pencil /> {t("common:actions.rename")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onSelect={() => setDeckToDelete(d)}>
                                                <Trash2 /> {t("common:actions.delete")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                <section aria-label={t("list.ariaLabel")}>
                    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="relative min-w-48 flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("list.searchPlaceholder")} className="pl-9" aria-label={t("list.searchAria")} />
                        </div>
                        <Select value={query.status ?? ALL} onValueChange={(v) => setFilter("status", v === ALL ? undefined : (v as CardStatus))}>
                            <SelectTrigger className="w-auto min-w-36 max-w-full" aria-label={t("list.filterStatus")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CardStatusFilterOptions.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={query.topic_id ?? ALL} onValueChange={(v) => setFilter("topic_id", v === ALL ? undefined : v)}>
                            <SelectTrigger className="w-auto min-w-40 max-w-64" aria-label={t("list.filterTopic")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t("list.allTopics")}</SelectItem>
                                {topics.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.depth ? "↳ " : ""}
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            className="w-28"
                            placeholder={t("list.tagPlaceholder")}
                            aria-label={t("list.filterTag")}
                            value={query.tag ?? ""}
                            onChange={(e) => setFilter("tag", e.target.value.replace(/^#/, "").trim().toLowerCase() || undefined)}
                        />
                    </div>

                    {isPending ? (
                        <ListSkeleton rows={6} />
                    ) : !cards.length ? (
                        <EmptyState
                            icon={Layers}
                            title={query.search || query.status || query.tag || query.topic_id ? t("empty.filteredTitle") : t("empty.title")}
                            description={t("empty.description")}
                            action={
                                can.contribute ? (
                                    <Button onClick={() => setGenerateOpen(true)}>
                                        <Sparkles /> {t("actions.generateWithAi")}
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <ul className="space-y-2">
                            {cards.map((c) => {
                                const open = revealed.has(c.id);
                                return (
                                    <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                                        <div className="flex items-start gap-3">
                                            <button
                                                type="button"
                                                onClick={() => toggleReveal(c.id)}
                                                aria-expanded={open}
                                                className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                                            >
                                                <Markdown content={c.front} className="font-medium" />
                                                {open ? (
                                                    <div className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                                                        <Markdown content={c.back} />
                                                    </div>
                                                ) : (
                                                    <p className="mt-1 text-xs text-muted-foreground">{t("list.showAnswer")}</p>
                                                )}
                                            </button>
                                            {(can.edit || can.contribute) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" aria-label={t("list.cardActions")}>
                                                            <MoreHorizontal />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            disabled={!can.edit}
                                                            onSelect={() => {
                                                                setEditing(c);
                                                                setEditorOpen(true);
                                                            }}
                                                        >
                                                            <Pencil /> {t("common:actions.edit")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem disabled={!can.edit} className="text-destructive" onSelect={() => setCardToDelete(c)}>
                                                            <Trash2 /> {t("common:actions.delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                                            <span className={cn("rounded-full px-2 py-0.5 font-medium", statusTone[c.state.status])}>{getCardStatusLabel(c.state.status)}</span>
                                            {c.deck && <Badge variant="outline">{c.deck.name}</Badge>}
                                            {c.topic && <Badge variant="outline">{c.topic.name}</Badge>}
                                            <span className="text-muted-foreground">{getQuestionDifficultyLabel(c.difficulty)}</span>
                                            {c.origin === "AI" && <Badge variant="secondary">{t("list.aiBadge")}</Badge>}
                                            {c.tags.map((t) => (
                                                <span key={t} className="text-muted-foreground">
                                                    #{t}
                                                </span>
                                            ))}
                                            {c.state.due_at && <span className="ml-auto text-muted-foreground">{t("list.dueOn", { date: formatDate(c.state.due_at) })}</span>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {pagination && pagination.total_pages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {t("list.pagination", { page: pagination.page, pages: pagination.total_pages, count: pagination.total })}
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}>
                                    {t("common:actions.previous")}
                                </Button>
                                <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}>
                                    {t("common:actions.next")}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <FlashcardEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                card={editing}
                decks={decks}
                topics={topics}
                defaultDeckId={query.deck_id}
                isPending={createCard.isPending || updateCard.isPending}
                onSubmit={(dto) => {
                    const done = { onSuccess: () => setEditorOpen(false) };
                    if (editing) updateCard.mutate({ id: editing.id, dto }, done);
                    else createCard.mutate({ projectId, dto }, done);
                }}
            />
            <GenerateFlashcardsDialog
                open={generateOpen}
                onOpenChange={setGenerateOpen}
                decks={decks}
                topics={topics}
                documents={documents}
                defaultDeckId={query.deck_id}
                isPending={generate.isPending}
                onSubmit={(dto) => generate.mutate({ projectId, dto }, { onSuccess: () => setGenerateOpen(false) })}
            />
            <DeckDialog
                open={deckDialog.open}
                deck={deckDialog.deck}
                onOpenChange={(open) => setDeckDialog((s) => ({ ...s, open }))}
                isPending={createDeck.isPending || updateDeck.isPending}
                onSubmit={(dto) => {
                    const done = { onSuccess: () => setDeckDialog({ open: false, deck: null }) };
                    if (deckDialog.deck) updateDeck.mutate({ id: deckDialog.deck.id, dto }, done);
                    else createDeck.mutate({ projectId, dto }, done);
                }}
            />
            <ConfirmationDialog
                isOpen={!!cardToDelete}
                onClose={() => setCardToDelete(null)}
                onConfirm={() => cardToDelete && deleteCard.mutate(cardToDelete.id, { onSuccess: () => setCardToDelete(null) })}
                title={t("confirm.deleteCardTitle")}
                description={t("confirm.deleteCardDescription")}
                confirmText={t("common:actions.delete")}
                variant="destructive"
                isLoading={deleteCard.isPending}
            />
            <ConfirmationDialog
                isOpen={!!deckToDelete}
                onClose={() => setDeckToDelete(null)}
                onConfirm={() =>
                    deckToDelete &&
                    deleteDeck.mutate(deckToDelete.id, {
                        onSuccess: () => {
                            if (query.deck_id === deckToDelete.id) setFilter("deck_id", undefined);
                            setDeckToDelete(null);
                        },
                    })
                }
                title={t("confirm.deleteDeckTitle", { name: deckToDelete?.name ?? "" })}
                description={t("confirm.deleteDeckDescription")}
                confirmText={t("confirm.deleteDeckConfirm")}
                variant="destructive"
                isLoading={deleteDeck.isPending}
            />
        </Main>
    );
}
