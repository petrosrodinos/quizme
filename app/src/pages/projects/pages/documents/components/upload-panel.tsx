import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Upload } from "lucide-react";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { DocumentUploadExtensions } from "@/config/constants/dropdowns/documents/document-file-type.options";
import { useUploadDocuments } from "@/features/documents/hooks/use-documents";
import type { UploadResult } from "@/features/documents/interfaces/documents.interfaces";

const MAX_BYTES = 50 * 1024 * 1024;

export const UploadPanel = ({ projectId }: { projectId: string }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<UploadResult[]>([]);
    const upload = useUploadDocuments();

    const start = () => {
        setProgress(0);
        upload.mutate(
            { projectId, files, onProgress: setProgress },
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
                Upload study material
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">PDF, Word (.docx), text or Markdown — up to 10 files at once, 50 MB each. Large documents are processed in the background.</p>
            <FileDropzone
                accept={DocumentUploadExtensions}
                maxSizeBytes={MAX_BYTES}
                maxFiles={10}
                files={files}
                onFilesChange={setFiles}
                disabled={upload.isPending}
                onRejected={(msgs) => toast({ title: "Some files were skipped", description: msgs.join("\n"), variant: "error" })}
            />
            {upload.isPending && (
                <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading…</span>
                        <span className="tabular-nums">{progress}%</span>
                    </div>
                    <Progress value={progress} aria-label="Upload progress" />
                </div>
            )}
            {files.length > 0 && (
                <div className="mt-4 flex justify-end">
                    <Button onClick={start} loading={upload.isPending}>
                        <Upload /> Upload {files.length} file{files.length === 1 ? "" : "s"}
                    </Button>
                </div>
            )}
            {results.length > 0 && !upload.isPending && (
                <ul className="mt-4 space-y-1.5" aria-label="Upload results">
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
                                <span className="text-muted-foreground"> — {r.status === "queued" ? "processing started" : r.reason}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
