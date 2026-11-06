import { DocumentFileTypes, type DocumentFileType } from "@/features/documents/interfaces/documents.interfaces";
import { tOption } from "@/lib/i18n-options";

export const DocumentFileTypeOptions: { id: DocumentFileType; label: string }[] = [
    tOption(DocumentFileTypes.PDF, "documents:fileType.PDF"),
    tOption(DocumentFileTypes.DOCX, "documents:fileType.DOCX"),
    tOption(DocumentFileTypes.TXT, "documents:fileType.TXT"),
    tOption(DocumentFileTypes.MARKDOWN, "documents:fileType.MARKDOWN"),
];

export const getDocumentFileTypeLabel = (type: string): string => DocumentFileTypeOptions.find((o) => o.id === type)?.label ?? type;

/** Accepted upload extensions (keep in sync with the API's SupportedFormats). */
export const DocumentUploadExtensions = [".pdf", ".docx", ".txt", ".md", ".markdown"];
