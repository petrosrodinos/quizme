import { Check, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { DocumentPipelineSteps, getDocumentStatusDescription, getDocumentStatusLabel } from "@/config/constants/dropdowns/documents/document-status.options";
import { DocumentStatuses, type DocumentStatus } from "@/features/documents/interfaces/documents.interfaces";
import { useTranslation } from "react-i18next";

/** Maps every status to its position in the visible pipeline. */
const stepIndex = (status: DocumentStatus) => {
    if (status === DocumentStatuses.PROCESSING) return 1;
    const i = DocumentPipelineSteps.indexOf(status);
    return i < 0 ? 0 : i;
};

interface DocumentStatusStepperProps {
    status: DocumentStatus;
    progress: number;
}

/** Uploading → Extracting → Chunking → Indexing → Ready, with a progress bar for the active step. */
export const DocumentStatusStepper = ({ status, progress }: DocumentStatusStepperProps) => {
    const { t } = useTranslation("documents");
    if (status === DocumentStatuses.FAILED) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                <XCircle className="h-3.5 w-3.5" /> {getDocumentStatusLabel(DocumentStatuses.FAILED)}
            </span>
        );
    }
    if (status === DocumentStatuses.READY) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <Check className="h-3.5 w-3.5" /> {getDocumentStatusLabel(DocumentStatuses.READY)}
            </span>
        );
    }
    const current = stepIndex(status);
    return (
        <div className="w-full max-w-xs space-y-1.5" role="status" aria-live="polite" aria-label={t("stepper.progressLabel", { status: getDocumentStatusLabel(status), progress })}>
            <ol className="flex items-center gap-1">
                {DocumentPipelineSteps.map((step, i) => (
                    <li key={step} className="flex flex-1 items-center gap-1">
                        <span
                            className={cn(
                                "h-1.5 flex-1 rounded-full",
                                i < current ? "bg-primary" : i === current ? "animate-pulse bg-primary/60" : "bg-muted",
                            )}
                            title={getDocumentStatusLabel(step)}
                        />
                    </li>
                ))}
            </ol>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                <span className="font-medium text-foreground">{getDocumentStatusLabel(status)}</span>
                <span className="truncate">· {getDocumentStatusDescription(status)}</span>
                <span className="ml-auto tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" aria-hidden />
        </div>
    );
};
