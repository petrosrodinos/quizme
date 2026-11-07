import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Upload } from "lucide-react";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { DocumentUploadExtensions } from "@/config/constants/dropdowns/documents/document-file-type.options";
import { useUploadDocuments } from "@/features/documents/hooks/use-documents";
import type { UploadResult } from "@/features/documents/interfaces/documents.interfaces";
import { useTranslation } from "react-i18next";
import { translateServerMessage } from "@/lib/api-error";
import { LessonSelect } from "@/pages/projects/components/lesson-select";

const MAX_BYTES = 50 * 1024 * 1024;

export const UploadPanel = ({ projectId }: { projectId: string }) => {
    const { t } = useTranslation("documents");
    const [files, setFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<UploadResult[]>([]);
    const [lessonId, setLessonId] = useState<string | undefined>();
    const upload = useUploadDocuments();

    const start = () => {
        setProgress(0);
        upload.mutate(
            { projectId, files, lessonId, onProgress: setProgress },
            {
                onSuccess: (res) => {
                    setResults(res.results);
                    setFiles([]);
                },
            },
        );
    };

    return (
        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="mb-1 font-display text-xl">
                {t("upload.title")}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{t("upload.description")}</p>
            <LessonSelect projectId={projectId} value={lessonId} onChange={setLessonId} className="mb-4 sm:max-w-xs" />
            <FileDropzone
                accept={DocumentUploadExtensions}
                maxSizeBytes={MAX_BYTES}
                maxFiles={10}
                files={files}
                onFilesChange={setFiles}
                disabled={upload.isPending}
                onRejected={(msgs) => toast({ title: t("upload.skipped"), description: msgs.join("\n"), variant: "error" })}
            />
            {upload.isPending && (
                <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("upload.uploading")}</span>
                        <span className="tabular-nums">{progress}%</span>
                    </div>
                    <Progress value={progress} aria-label={t("upload.progressLabel")} />
                </div>
            )}
            {files.length > 0 && (
                <div className="mt-4 flex justify-end">
                    <Button onClick={start} loading={upload.isPending}>
                        <Upload /> {t("upload.button", { count: files.length })}
                    </Button>
                </div>
            )}
            {results.length > 0 && !upload.isPending && (
                <ul className="mt-4 space-y-1.5" aria-label={t("upload.resultsLabel")}>
                    {results.map((r) => (
                        <li key={r.filename} className="flex items-start gap-2 text-sm">
                            {r.status === "queued" ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            ) : r.status === "duplicate" ? (
                                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                            )}
                            <span className="min-w-0">
                                <span className="font-medium">{r.filename}</span>
                                <span className="text-muted-foreground"> — {r.status === "queued" ? t("upload.processingStarted") : r.reason ? translateServerMessage(r.reason) : t("upload.duplicate")}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
