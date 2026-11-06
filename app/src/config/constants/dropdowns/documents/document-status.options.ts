import { DocumentStatuses, type DocumentStatus } from "@/features/documents/interfaces/documents.interfaces";
import { tOption } from "@/lib/i18n-options";

const status = (id: DocumentStatus) => tOption(id, `documents:status.${id}.label`, `documents:status.${id}.description`) as { id: DocumentStatus; label: string; description: string };

export const DocumentStatusOptions: { id: DocumentStatus; label: string; description: string }[] = [
    status(DocumentStatuses.UPLOADED),
    status(DocumentStatuses.PROCESSING),
    status(DocumentStatuses.EXTRACTING),
    status(DocumentStatuses.CHUNKING),
    status(DocumentStatuses.INDEXING),
    status(DocumentStatuses.READY),
    status(DocumentStatuses.FAILED),
];

/** Ordered pipeline steps shown in the processing stepper. */
export const DocumentPipelineSteps: DocumentStatus[] = [
    DocumentStatuses.UPLOADED,
    DocumentStatuses.EXTRACTING,
    DocumentStatuses.CHUNKING,
    DocumentStatuses.INDEXING,
    DocumentStatuses.READY,
];

export const getDocumentStatusLabel = (status: string): string => DocumentStatusOptions.find((o) => o.id === status)?.label ?? status;
export const getDocumentStatusDescription = (status: string): string => DocumentStatusOptions.find((o) => o.id === status)?.description ?? "";
