import { Link } from "react-router-dom";
import { BookOpen, Download, FileText, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Routes } from "@/routes/routes";
import { formatBytes, formatNumber } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { getDocumentFileTypeLabel } from "@/config/constants/dropdowns/documents/document-file-type.options";
import type { StudyDocument } from "@/features/documents/interfaces/documents.interfaces";
import { DocumentStatusStepper } from "./document-status-stepper";
import { useTranslation } from "react-i18next";
import { translateServerMessage } from "@/lib/api-error";

const typeTone: Record<string, string> = {
    PDF: "bg-destructive/10 text-destructive",
    DOCX: "bg-teal/15 text-teal",
    TXT: "bg-muted text-muted-foreground",
    MARKDOWN: "bg-amber/15 text-amber",
};

interface DocumentRowProps {
    doc: StudyDocument;
    projectId: string;
    canContribute: boolean;
    canEdit: boolean;
    onDownload: () => void;
    onReprocess: () => void;
    onDelete: () => void;
}

export const DocumentRow = ({ doc, projectId, canContribute, canEdit, onDownload, onReprocess, onDelete }: DocumentRowProps) => {
    const { t } = useTranslation("documents");
    const ready = doc.status === "READY";
    return (
        <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${typeTone[doc.file_type] ?? "bg-muted"}`}>
                    <span className="sr-only">{getDocumentFileTypeLabel(doc.file_type)}</span>
                    <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    {ready ? (
                        <Link to={Routes.projects.document(projectId, doc.id)} className="block truncate font-medium hover:text-primary">
                            {doc.filename}
                        </Link>
                    ) : (
                        <div className="truncate font-medium">{doc.filename}</div>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{getDocumentFileTypeLabel(doc.file_type)}</span>
                        <span>{formatBytes(doc.size_bytes)}</span>
                        {doc.page_count != null && <span>{t("row.pages", { count: doc.page_count, formatted: formatNumber(doc.page_count) })}</span>}
                        {doc.word_count != null && <span>{t("row.words", { count: doc.word_count })}</span>}
                        <span>{t("row.uploaded", { date: formatDate(doc.created_at) })}</span>
                    </div>
                    {doc.error_message && <p className="mt-1 text-xs text-destructive">{translateServerMessage(doc.error_message)}</p>}
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:w-80 sm:justify-end">
                <DocumentStatusStepper status={doc.status} progress={doc.progress} />
                <div className="flex shrink-0 items-center gap-1">
                    {ready && (
                        <Button asChild variant="ghost" size="sm">
                            <Link to={Routes.projects.document(projectId, doc.id)}>
                                <BookOpen /> {t("row.read")}
                            </Link>
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("row.actions", { name: doc.filename })}>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onDownload}>
                                <Download className="mr-2 h-4 w-4" /> {t("row.download")}
                            </DropdownMenuItem>
                            {canContribute && (
                                <DropdownMenuItem onClick={onReprocess}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> {t("row.reprocess")}
                                </DropdownMenuItem>
                            )}
                            {canEdit && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> {t("row.delete")}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </li>
    );
};
