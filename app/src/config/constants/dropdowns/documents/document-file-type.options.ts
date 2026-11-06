import { DocumentFileTypes, type DocumentFileType } from "@/features/documents/interfaces/documents.interfaces";

export const DocumentFileTypeOptions: { id: DocumentFileType; label: string }[] = [
    { id: DocumentFileTypes.PDF, label: "PDF" },
    { id: DocumentFileTypes.DOCX, label: "Word" },
    { id: DocumentFileTypes.TXT, label: "Text" },
    { id: DocumentFileTypes.MARKDOWN, label: "Markdown" },
];

export const getDocumentFileTypeLabel = (type: string): string => DocumentFileTypeOptions.find((o) => o.id === type)?.label ?? type;

/** Accepted upload extensions (keep in sync with the API's SupportedFormats). */
export const DocumentUploadExtensions = [".pdf", ".docx", ".txt", ".md", ".markdown"];
