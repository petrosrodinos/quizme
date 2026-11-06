import { DocumentStatuses, type DocumentStatus } from "@/features/documents/interfaces/documents.interfaces";

export const DocumentStatusOptions: { id: DocumentStatus; label: string; description: string }[] = [
    { id: DocumentStatuses.UPLOADED, label: "Uploaded", description: "Waiting to be processed" },
    { id: DocumentStatuses.PROCESSING, label: "Processing", description: "Preparing the file" },
    { id: DocumentStatuses.EXTRACTING, label: "Extracting", description: "Reading text and structure" },
    { id: DocumentStatuses.CHUNKING, label: "Chunking", description: "Splitting into study sections" },
    { id: DocumentStatuses.INDEXING, label: "Indexing", description: "Building the searchable knowledge layer" },
    { id: DocumentStatuses.READY, label: "Ready", description: "Available to the tutor and generators" },
    { id: DocumentStatuses.FAILED, label: "Failed", description: "Processing failed" },
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
