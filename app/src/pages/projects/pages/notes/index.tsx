import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, MoreHorizontal, Pencil, Plus, Search, Share2, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { Markdown } from "@/components/ui/markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { ExportMenu } from "@/pages/projects/components/export-menu";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import { useCreateNote, useDeleteNote, useNotes, useTransformNotes, useUpdateNote } from "@/features/notes/hooks/use-notes";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import type { NoteScope, NotesQuery, NoteTransformTarget, NoteType, NoteWithRelations } from "@/features/notes/interfaces/notes.interfaces";
import { NoteTypeFilterOptions, getNoteTypeLabel } from "@/config/constants/dropdowns/notes/note-type.options";
import { NoteScopeFilterOptions } from "@/config/constants/dropdowns/notes/note-scope.options";
import { NoteTransformOptions } from "@/config/constants/dropdowns/notes/note-transform.options";
import { NoteEditorDialog } from "./components/note-editor-dialog";
import type { NoteFormValues } from "./validation-schemas/note.schema";

const ALL = "all";
const colorBorder: Record<string, string> = {
    amber: "border-l-amber",
    teal: "border-l-teal",
    coral: "border-l-primary",
    violet: "border-l-chart-4",
};

export default function ProjectNotesPage() {
    usePageMetadata({ title: "Notes" });
    const { projectId, can } = useProjectContext();
    const navigate = useNavigate();
    const me = useAuthStore((s) => s.user?.id);
    const { flat: topics } = useFlatTopics(projectId);
    const { data: documents = [] } = useDocuments(projectId);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState<NotesQuery>({ scope: "all" });
    useEffect(() => {
        const t = setTimeout(() => setQuery((q) => ({ ...q, search: search.trim() || undefined })), 300);
        return () => clearTimeout(t);
    }, [search]);
    const { data: notes = [], isPending } = useNotes(projectId, query);
    const create = useCreateNote();
    const update = useUpdateNote();
    const remove = useDeleteNote();
    const transform = useTransformNotes();

    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<NoteWithRelations | null>(null);
    const [toDelete, setToDelete] = useState<NoteWithRelations | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const visibleIds = useMemo(() => new Set(notes.map((n) => n.id)), [notes]);
    const selectedIds = [...selected].filter((id) => visibleIds.has(id));
    const setFilter = <K extends keyof NotesQuery>(key: K, value: NotesQuery[K] | undefined) => setQuery((q) => ({ ...q, [key]: value }));

    const toggle = (id: string) =>
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const runTransform = (target: NoteTransformTarget) =>
        transform.mutate(
            { projectId, note_ids: selectedIds, target },
            {
                onSuccess: (result) => {
                    setSelected(new Set());
                    if (result.kind === "quiz") navigate(Routes.projects.quiz_take(projectId, result.quiz_id));
                    if (result.kind === "note") {
                        setEditing(result.note as NoteWithRelations);
                        setEditorOpen(true);
                    }
                },
            },
        );

    const save = (v: NoteFormValues) => {
        const dto = {
            type: v.type,
            title: v.title?.trim() || undefined,
            content: v.content,
            tags: v.tags,
            color: v.color,
            topic_id: v.topic_id,
            is_shared: can.contribute ? v.is_shared : undefined,
        };
        const done = { onSuccess: () => setEditorOpen(false) };
        if (editing) update.mutate({ id: editing.id, dto }, done);
        else create.mutate({ projectId, dto }, done);
    };

    return (
        <Main width="wide">
            <PageHeader
                title="Notes"
                description="Your notes, highlights, annotations, bookmarks and questions — connected to the material they came from."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <ExportMenu projectId={projectId} type="notes" />
                        <Button
                            onClick={() => {
                                setEditing(null);
                                setEditorOpen(true);
                            }}
                        >
                            <Plus /> New note
                        </Button>
                    </div>
                }
            />

            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative min-w-48 flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…" className="pl-9" aria-label="Search notes" />
                </div>
                <Select value={query.type ?? ALL} onValueChange={(v) => setFilter("type", v === ALL ? undefined : (v as NoteType))}>
                    <SelectTrigger className="w-36" aria-label="Filter by type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {NoteTypeFilterOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={query.scope ?? "all"} onValueChange={(v) => setFilter("scope", v as NoteScope)}>
                    <SelectTrigger className="w-44" aria-label="Filter by owner">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {NoteScopeFilterOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={query.document_id ?? ALL} onValueChange={(v) => setFilter("document_id", v === ALL ? undefined : v)}>
                    <SelectTrigger className="w-48" aria-label="Filter by document">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>All documents</SelectItem>
                        {documents.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                                {d.filename}
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
            </div>

            {selectedIds.length > 0 && (
                <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3" role="region" aria-label="Selection actions">
                    <span className="text-sm font-medium">{selectedIds.length} selected</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" loading={transform.isPending}>
                                <Sparkles /> Transform with AI
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72">
                            <DropdownMenuLabel>Turn selected notes into…</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {NoteTransformOptions.map((o) => (
                                <DropdownMenuItem key={o.id} onSelect={() => runTransform(o.id)} className="flex-col items-start">
                                    <span className="font-medium">{o.label}</span>
                                    <span className="text-xs text-muted-foreground">{o.description}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                        Clear
                    </Button>
                </div>
            )}

            {isPending ? (
                <ListSkeleton rows={6} />
            ) : !notes.length ? (
                <EmptyState
                    icon={StickyNote}
                    title={query.search || query.type || query.document_id || query.topic_id ? "No notes match these filters" : "No notes yet"}
                    description="Write notes here, or highlight text while reading a document to capture it with its source."
                    action={
                        <Button
                            onClick={() => {
                                setEditing(null);
                                setEditorOpen(true);
                            }}
                        >
                            <Plus /> New note
                        </Button>
                    }
                />
            ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                    {notes.map((n) => {
                        const mine = n.user_id === me;
                        const canEdit = mine || can.edit;
                        const canDelete = mine || can.manageMembers;
                        return (
                            <li
                                key={n.id}
                                className={cn(
                                    "flex flex-col rounded-xl border border-l-4 border-border bg-card p-4",
                                    n.color ? colorBorder[n.color] ?? "border-l-border" : "border-l-border",
                                    selected.has(n.id) && "ring-2 ring-primary/40",
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggle(n.id)} aria-label={`Select note ${n.title ?? ""}`} className="mt-1" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge variant="outline">{getNoteTypeLabel(n.type)}</Badge>
                                            {n.is_shared && (
                                                <Badge variant="secondary">
                                                    <Share2 className="h-3 w-3" /> Shared
                                                </Badge>
                                            )}
                                            {!mine && n.user && <span className="text-xs text-muted-foreground">by {n.user.full_name || n.user.email}</span>}
                                        </div>
                                        {n.title && <h3 className="mt-2 font-medium">{n.title}</h3>}
                                    </div>
                                    {(canEdit || canDelete) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" aria-label="Note actions">
                                                    <MoreHorizontal />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    disabled={!canEdit}
                                                    onSelect={() => {
                                                        setEditing(n);
                                                        setEditorOpen(true);
                                                    }}
                                                >
                                                    <Pencil /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled={!canDelete} className="text-destructive" onSelect={() => setToDelete(n)}>
                                                    <Trash2 /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                                {n.selection_text && (
                                    <blockquote className="mt-3 line-clamp-4 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">{n.selection_text}</blockquote>
                                )}
                                {n.content && n.content !== n.selection_text && (
                                    <div className="mt-3 line-clamp-[10] text-sm">
                                        <Markdown content={n.content} />
                                    </div>
                                )}
                                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-muted-foreground">
                                    {n.document && (
                                        <Link to={Routes.projects.document(projectId, n.document.id)} className="inline-flex items-center gap-1 text-primary hover:underline">
                                            <FileText className="h-3 w-3" aria-hidden />
                                            {n.document.filename}
                                            {n.page ? `, p.${n.page}` : ""}
                                        </Link>
                                    )}
                                    {n.topic && <span>· {n.topic.name}</span>}
                                    {n.tags.map((t) => (
                                        <span key={t}>#{t}</span>
                                    ))}
                                    <span className="ml-auto">{formatRelative(n.updated_at)}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <NoteEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                note={editing}
                topics={topics}
                canShare={can.contribute && (!editing || editing.user_id === me)}
                isPending={create.isPending || update.isPending}
                onSubmit={save}
            />
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title="Delete this note?"
                description="This cannot be undone."
                confirmText="Delete"
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
