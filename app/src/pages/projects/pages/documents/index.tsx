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
import { useTranslation } from "react-i18next";

export default function ProjectDocumentsPage() {
    const { t } = useTranslation("documents");
    const { project, projectId, can } = useProjectContext();
    usePageMetadata({ title: t("page.metaTitle", { title: project.title }) });
    const { data: docs, isPending, isError, error, refetch } = useDocuments(projectId);
    const download = useDownloadDocument();
    const reprocess = useReprocessDocument();
    const remove = useDeleteDocument();
    const [deleting, setDeleting] = useState<StudyDocument | null>(null);

    const processing = docs?.filter((d) => d.status !== "READY" && d.status !== "FAILED").length ?? 0;

    return (
        <Main>
            <PageHeader
                title={t("page.title")}
                description={
                    docs?.length
                        ? t("page.description", {
                            summary: processing
                                ? t("page.summaryProcessing", { summary: t("page.summary", { count: docs.length }), count: processing })
                                : t("page.summary", { count: docs.length }),
                        })
                        : t("page.descriptionEmpty")
                }
            />
            <div className="space-y-6">
                {can.contribute && <UploadPanel projectId={projectId} />}

                {isPending ? (
                    <ListSkeleton rows={4} />
                ) : isError ? (
                    <EmptyState title={t("page.loadError")} description={error.message} action={<Button variant="outline" onClick={() => refetch()}>{t("common:actions.tryAgain")}</Button>} />
                ) : !docs.length ? (
                    <EmptyState icon={FileText} title={t("page.empty.title")} description={t("page.empty.description")} compact />
                ) : (
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card" aria-label={t("page.listLabel")}>
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
                title={t("delete.title", { name: deleting?.filename ?? "" })}
                description={t("delete.description")}
                confirmText={t("delete.confirm")}
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
