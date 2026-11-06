import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Copy, FileText, Loader2, RefreshCw, ScrollText, Sparkles, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Markdown } from "@/components/ui/markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { toast } from "@/hooks/use-toast";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { ExportMenu } from "@/pages/projects/components/export-menu";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import { useCreateSummary, useDeleteSummary, useSummaries, useSummary, isSummaryGenerating } from "@/features/summaries/hooks/use-summaries";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import type { SummaryLevel } from "@/features/summaries/interfaces/summaries.interfaces";
import { SummaryLevelFormOptions, getSummaryLevelDescription, getSummaryLevelLabel } from "@/config/constants/dropdowns/summaries/summary-level.options";

const WHOLE = "project";

export default function ProjectSummariesPage() {
    usePageMetadata({ title: "Summaries" });
    const { projectId, project } = useProjectContext();
    const queryClient = useQueryClient();
    const { data: documents = [] } = useDocuments(projectId);
    const { data: summaries = [], isPending: listPending } = useSummaries(projectId);
    const create = useCreateSummary();
    const remove = useDeleteSummary();
    const [scope, setScope] = useState<string>(WHOLE);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<string | null>(null);
    const { data: active, isPending: activePending } = useSummary(activeId);

    useEffect(() => {
        if (!activeId && summaries.length) setActiveId(summaries[0].id);
    }, [summaries, activeId]);

    useRealtimeEvent<{ kind: string; id: string; status: string; error?: string | null }>(RealtimeEvents.GENERATION_STATUS, (e) => {
        if (e.kind !== "summary") return;
        queryClient.invalidateQueries({ queryKey: ["summary", e.id] });
        queryClient.invalidateQueries({ queryKey: ["summaries"] });
        if (e.status === "FAILED") toast({ title: "Summary failed", description: e.error ?? "Please try again.", variant: "error" });
    });

    const readyDocs = documents.filter((d) => d.status === "READY");
    const generate = (level: SummaryLevel, force = false, documentId?: string | null) =>
        create.mutate(
            { projectId, dto: { level, document_id: documentId ?? (scope === WHOLE ? undefined : scope), force } },
            { onSuccess: (s) => setActiveId(s.id) },
        );

    const copy = async () => {
        if (!active?.content) return;
        try {
            await navigator.clipboard.writeText(active.content);
            toast({ title: "Copied to clipboard", duration: 1500 });
        } catch {
            toast({ title: "Could not copy", variant: "error" });
        }
    };

    return (
        <Main width="wide">
            <PageHeader
                title="Summaries"
                description="From a one-minute overview to a full study guide — generated from your own material and saved for reuse."
                actions={<ExportMenu projectId={projectId} type="study_guides" label="Export study guides" formats={["md", "txt", "html", "json"]} />}
            />

            <section aria-label="Generate a summary" className="mb-6 rounded-xl border border-border bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">Summarize</span>
                    <Select value={scope} onValueChange={setScope}>
                        <SelectTrigger className="w-64" aria-label="Summary scope">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={WHOLE}>Whole project — {project.title}</SelectItem>
                            {readyDocs.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                    {d.filename}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {SummaryLevelFormOptions.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            disabled={create.isPending || !readyDocs.length}
                            onClick={() => generate(o.id)}
                            className="group flex flex-col rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                        >
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                                {o.label}
                            </span>
                            <span className="mt-1 text-xs text-muted-foreground">{getSummaryLevelDescription(o.id)}</span>
                        </button>
                    ))}
                </div>
                {!readyDocs.length && <p className="mt-2 text-xs text-muted-foreground">Upload and process a document first.</p>}
            </section>

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                <aside aria-label="Saved summaries">
                    <h2 className="mb-2 text-sm font-medium text-muted-foreground">Saved summaries</h2>
                    {listPending ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : !summaries.length ? (
                        <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                            {summaries.map((s) => (
                                <li key={s.id} className="shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setActiveId(s.id)}
                                        aria-current={activeId === s.id}
                                        className={cn(
                                            "w-56 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
                                            activeId === s.id ? "border-primary/50 bg-surface-card" : "border-border bg-card hover:bg-muted",
                                        )}
                                    >
                                        <span className="flex items-center justify-between gap-2 font-medium">
                                            {getSummaryLevelLabel(s.level)}
                                            {isSummaryGenerating(s.status) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Generating" />}
                                            {s.status === "FAILED" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-label="Failed" />}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {s.document?.filename ?? "Whole project"} · {formatRelative(s.created_at)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <article aria-label="Summary" className="min-h-80 rounded-xl border border-border bg-card p-6">
                    {!activeId ? (
                        <EmptyState icon={ScrollText} title="No summary selected" description="Pick a level above to generate your first summary." compact />
                    ) : activePending || !active ? (
                        <div className="space-y-3">
                            <Skeleton className="h-8 w-1/2" />
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                                <div>
                                    <h2 className="font-display text-2xl">{getSummaryLevelLabel(active.level)}</h2>
                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <FileText className="h-3.5 w-3.5" aria-hidden />
                                        {active.document?.filename ?? "Whole project"}
                                        {active.model && <Badge variant="outline">{active.model}</Badge>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={copy} disabled={active.status !== "READY"}>
                                        <Copy /> Copy
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => generate(active.level, true, active.document_id)}
                                        disabled={create.isPending || isSummaryGenerating(active.status)}
                                    >
                                        <RefreshCw /> Regenerate
                                    </Button>
                                    <Button size="icon" variant="ghost" aria-label="Delete summary" onClick={() => setToDelete(active.id)}>
                                        <Trash2 />
                                    </Button>
                                </div>
                            </header>
                            {isSummaryGenerating(active.status) ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" aria-live="polite">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
                                    <p className="font-medium">Writing your summary…</p>
                                    <p className="max-w-sm text-sm text-muted-foreground">Large material is summarized section by section, then combined. This can take a minute.</p>
                                </div>
                            ) : active.status === "FAILED" ? (
                                <EmptyState
                                    icon={AlertTriangle}
                                    title="Generation failed"
                                    description={active.error_message ?? "Please try again."}
                                    action={<Button onClick={() => generate(active.level, true, active.document_id)}>Try again</Button>}
                                    compact
                                />
                            ) : (
                                <Markdown content={active.content} className="prose-study" />
                            )}
                        </>
                    )}
                </article>
            </div>

            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() =>
                    toDelete &&
                    remove.mutate(toDelete, {
                        onSuccess: () => {
                            setToDelete(null);
                            setActiveId(null);
                        },
                    })
                }
                title="Delete this summary?"
                description="You can always generate it again."
                confirmText="Delete"
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
