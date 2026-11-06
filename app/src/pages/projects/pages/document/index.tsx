import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileWarning, Info, Loader2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { formatNumber } from "@/lib/format";
import { getDocumentStatusLabel } from "@/config/constants/dropdowns/documents/document-status.options";
import { useDocument, useDocumentContent } from "@/features/documents/hooks/use-documents";
import { useCreateReaderNote, useDocumentNotes } from "@/features/notes/hooks/use-reader-notes";
import { NoteTypes, type NoteType } from "@/features/notes/interfaces/notes.interfaces";
import { useGenerateFlashcards } from "@/features/flashcards/hooks/use-flashcard-generation";
import { useCreateQuickQuiz } from "@/features/quiz-generation/hooks/use-quiz-generation";
import { QuickQuizModes } from "@/features/quiz-generation/services/quiz-generation.services";
import type { TextAction } from "@/features/ai-actions/interfaces/ai-actions.interfaces";
import { useProjectContext } from "../../hooks/use-project-context";
import { useTextSelection, type ReaderSelection } from "./hooks/use-text-selection";
import { ReaderContent } from "./components/reader-content";
import { SelectionToolbar } from "./components/selection-toolbar";
import { WordPopover } from "./components/word-popover";
import { AiActionPanel, type ActionRequest } from "./components/ai-action-panel";
import { NoteDialog } from "./components/note-dialog";
import type { HighlightSpan } from "./utils/highlight.utils";

export default function ProjectDocumentReaderPage() {
    const { projectId } = useProjectContext();
    const { docId } = useParams<{ docId: string }>();
    const navigate = useNavigate();
    const { data: doc, isPending: docPending, isError: docError, error } = useDocument(docId);
    const content = useDocumentContent(doc?.status === "READY" ? docId : undefined);
    const { data: notes } = useDocumentNotes(projectId, docId);
    usePageMetadata({ title: doc?.filename ?? "Reader" });

    const containerRef = useRef<HTMLElement>(null);
    const floatingRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const { selection, clear } = useTextSelection(containerRef, floatingRef, doc?.status === "READY");
    const [request, setRequest] = useState<ActionRequest | null>(null);
    const [noteFor, setNoteFor] = useState<ReaderSelection | null>(null);

    const createNote = useCreateReaderNote();
    const generateCards = useGenerateFlashcards();
    const createQuiz = useCreateQuickQuiz();

    const chunks = useMemo(() => content.data?.pages.flatMap((p) => p.data) ?? [], [content.data]);
    const total = content.data?.pages[0]?.pagination.total ?? 0;
    const highlights: HighlightSpan[] = useMemo(
        () =>
            (notes ?? [])
                .filter((n) => n.selection_text)
                .map((n) => ({ text: n.selection_text!, color: n.color ?? (n.type === NoteTypes.HIGHLIGHT ? "amber" : "teal"), title: n.type === NoteTypes.HIGHLIGHT ? undefined : n.content.slice(0, 200) })),
        [notes],
    );

    // Infinite scroll.
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = content;
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const io = new IntersectionObserver((entries) => entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage(), { rootMargin: "800px" });
        io.observe(el);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, chunks.length]);

    const runAction = (action: TextAction, sel: ReaderSelection) => {
        setRequest({ action, text: sel.text, chunkId: sel.chunkId, page: sel.page });
        clear();
    };

    const quizFromSelection = (sel: ReaderSelection) => {
        createQuiz.mutate(
            { projectId, dto: { mode: QuickQuizModes.SELECTION, selection_text: sel.text, selection_document_id: docId, count: 5 } },
            { onSuccess: () => navigate(Routes.projects.quizzes(projectId)) },
        );
        clear();
    };

    const cardsFromSelection = (sel: ReaderSelection) => {
        generateCards.mutate({ projectId, dto: { count: Math.min(10, Math.max(3, Math.round(sel.text.length / 250))), selection_text: sel.text, document_ids: docId ? [docId] : undefined } });
        clear();
    };

    const highlight = (sel: ReaderSelection, color: string) => {
        createNote.mutate({
            projectId,
            dto: { type: NoteTypes.HIGHLIGHT, content: sel.text.slice(0, 2000), selection_text: sel.text.slice(0, 2000), color, document_id: docId, chunk_id: sel.chunkId ?? undefined, page: sel.page ?? undefined },
        });
        clear();
    };

    const saveNote = (type: NoteType, text: string) => {
        if (!noteFor) return;
        createNote.mutate(
            {
                projectId,
                dto: { type, content: text, selection_text: noteFor.text.slice(0, 2000), document_id: docId, chunk_id: noteFor.chunkId ?? undefined, page: noteFor.page ?? undefined },
            },
            { onSuccess: () => setNoteFor(null) },
        );
    };

    if (docPending)
        return (
            <Main width="narrow">
                <DetailSkeleton />
            </Main>
        );

    if (docError || !doc)
        return (
            <Main width="narrow">
                <EmptyState icon={FileWarning} title="Document unavailable" description={error?.message ?? "This document could not be found."} action={<Button asChild variant="outline"><Link to={Routes.projects.documents(projectId)}>Back to documents</Link></Button>} />
            </Main>
        );

    return (
        <Main width="narrow">
            <div className="mb-8 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <Link to={Routes.projects.documents(projectId)} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" /> Documents
                    </Link>
                    <h1 className="break-words font-display text-3xl leading-tight">{doc.filename.replace(/\.[^.]+$/, "")}</h1>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {doc.page_count != null && <span>{formatNumber(doc.page_count)} pages</span>}
                        {doc.word_count != null && <span>{formatNumber(doc.word_count)} words</span>}
                        <span>{formatNumber(doc.chunk_count)} sections</span>
                    </div>
                </div>
                {doc.view_url && (
                    <Button asChild variant="outline" size="sm">
                        <a href={doc.view_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink /> Open original
                        </a>
                    </Button>
                )}
            </div>

            {doc.status !== "READY" ? (
                <EmptyState
                    icon={doc.status === "FAILED" ? FileWarning : Loader2}
                    title={doc.status === "FAILED" ? "Processing failed" : `${getDocumentStatusLabel(doc.status)}…`}
                    description={doc.error_message ?? "This document is still being processed. The reader will be available once it's ready."}
                    action={<Button asChild variant="outline"><Link to={Routes.projects.documents(projectId)}>Back to documents</Link></Button>}
                />
            ) : (
                <>
                    <p className="mb-6 flex items-center gap-2 rounded-lg bg-surface-card px-3 py-2 text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Select any text for AI explanations, quizzes, flashcards and notes. Select a single word for an instant definition. Press Alt+A to reach the toolbar with the keyboard.
                    </p>
                    <article ref={containerRef} className="relative select-text" aria-label="Document text" tabIndex={-1}>
                        {content.isPending ? (
                            <div className="space-y-3">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <Skeleton key={i} className="h-4 w-full" />
                                ))}
                            </div>
                        ) : content.isError ? (
                            <EmptyState title="Couldn't load the text" description={content.error.message} action={<Button variant="outline" onClick={() => content.refetch()}>Try again</Button>} compact />
                        ) : (
                            <ReaderContent chunks={chunks} highlights={highlights} />
                        )}
                    </article>
                    <div ref={sentinelRef} className="py-8 text-center text-xs text-muted-foreground">
                        {isFetchingNextPage ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-label="Loading more" /> : !hasNextPage && chunks.length > 0 ? `End of document · ${total} sections` : null}
                    </div>
                </>
            )}

            {selection &&
                (selection.isWord ? (
                    <WordPopover ref={floatingRef} projectId={projectId} selection={selection} onAction={(a) => runAction(a, selection)} onClose={clear} />
                ) : (
                    <SelectionToolbar
                        ref={floatingRef}
                        selection={selection}
                        busy={createQuiz.isPending || generateCards.isPending}
                        onAction={(a) => runAction(a, selection)}
                        onCreateQuiz={() => quizFromSelection(selection)}
                        onCreateFlashcards={() => cardsFromSelection(selection)}
                        onHighlight={(c) => highlight(selection, c)}
                        onAddNote={() => {
                            setNoteFor(selection);
                            clear();
                        }}
                    />
                ))}

            {docId && <AiActionPanel projectId={projectId} documentId={docId} request={request} onClose={() => setRequest(null)} />}
            <NoteDialog open={!!noteFor} selectionText={noteFor?.text ?? ""} isPending={createNote.isPending} onClose={() => setNoteFor(null)} onSave={saveNote} />
        </Main>
    );
}
