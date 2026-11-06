import { useState } from "react";
import { FileText } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useDeleteDocument, useDocuments, useDownloadDocument, useReprocessDocument } from "@/features/documents/hooks/use-documents";
import type { StudyDocument } from "@/features/documents/interfaces/documents.interfaces";
import { useProjectContext } from "../../hooks/use-project-context";
import { UploadPanel } from "./components/upload-panel";
import { DocumentRow } from "./components/document-row";

export default function ProjectDocumentsPage() {
    const { project, projectId, can } = useProjectContext();
    usePageMetadata({ title: `${project.title} · Documents` });
    const { data: docs, isPending, isError, error, refetch } = useDocuments(projectId);
    const download = useDownloadDocument();
    const reprocess = useReprocessDocument();
    const remove = useDeleteDocument();
    const [deleting, setDeleting] = useState<StudyDocument | null>(null);

    const processing = docs?.filter((d) => d.status !== "READY" && d.status !== "FAILED").length ?? 0;

    return (
        <Main>
            <PageHeader
                title="Documents"
                description={
                    docs?.length
                        ? `${docs.length} document${docs.length === 1 ? "" : "s"}${processing ? ` · ${processing} processing` : ""}. Select text in the reader for instant AI explanations, quizzes and flashcards.`
                        : "Your study sources. Everything the tutor and generators use comes from here."
                }
            />
            <div className="space-y-6">
                {can.contribute && <UploadPanel projectId={projectId} />}

                {isPending ? (
                    <ListSkeleton rows={4} />
                ) : isError ? (
                    <EmptyState title="Couldn't load documents" description={error.message} action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>} />
                ) : !docs.length ? (
                    <EmptyState icon={FileText} title="No documents yet" description="Upload your textbooks, lecture notes or study guides to get started." compact />
                ) : (
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card" aria-label="Documents">
                        {docs.map((doc) => (
                            <DocumentRow
                                key={doc.id}
                                doc={doc}
                                projectId={projectId}
                                canContribute={can.contribute}
                                canEdit={can.edit}
                                onDownload={() => download.mutate(doc.id)}
                                onReprocess={() => reprocess.mutate(doc.id)}
                                onDelete={() => setDeleting(doc)}
                            />
                        ))}
                    </ul>
                )}
            </div>
            <ConfirmationDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
                title={`Delete "${deleting?.filename ?? ""}"?`}
                description="The file and its processed content will be removed. Questions and flashcards generated from it stay in your project."
                confirmText="Delete document"
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
