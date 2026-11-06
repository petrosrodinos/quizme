import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
    /** e.g. [".pdf", ".docx", ".txt", ".md"] */
    accept: string[];
    maxSizeBytes?: number;
    maxFiles?: number;
    files: File[];
    onFilesChange: (files: File[]) => void;
    onRejected?: (messages: string[]) => void;
    disabled?: boolean;
    className?: string;
    hint?: string;
}

/** Multi-file drag & drop picker with extension/size validation (presentational: parent owns state & upload). */
export const FileDropzone = ({ accept, maxSizeBytes, maxFiles = 20, files, onFilesChange, onRejected, disabled, className, hint }: FileDropzoneProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const addFiles = useCallback(
        (incoming: FileList | File[]) => {
            const rejected: string[] = [];
            const valid: File[] = [];
            for (const f of Array.from(incoming)) {
                const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
                if (!accept.includes(ext)) rejected.push(`${f.name}: unsupported file type`);
                else if (maxSizeBytes && f.size > maxSizeBytes) rejected.push(`${f.name}: exceeds ${formatBytes(maxSizeBytes)}`);
                else if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
                else valid.push(f);
            }
            const next = [...files, ...valid].slice(0, maxFiles);
            if (files.length + valid.length > maxFiles) rejected.push(`Only ${maxFiles} files can be uploaded at once`);
            onFilesChange(next);
            if (rejected.length) onRejected?.(rejected);
        },
        [accept, files, maxFiles, maxSizeBytes, onFilesChange, onRejected],
    );

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled && e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    };

    return (
        <div className={cn("space-y-3", className)}>
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                aria-label="Upload files: drop files here or press Enter to browse"
                onClick={() => !disabled && inputRef.current?.click()}
                onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !disabled) {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-border bg-surface/50 hover:border-primary/50",
                    disabled && "cursor-not-allowed opacity-60",
                )}
            >
                <UploadCloud className="h-8 w-8 text-primary" aria-hidden />
                <div className="text-sm font-medium">Drop files here or click to browse</div>
                <div className="text-xs text-muted-foreground">
                    {hint ?? `${accept.join(", ")}${maxSizeBytes ? ` · up to ${formatBytes(maxSizeBytes)} each` : ""}`}
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={accept.join(",")}
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
            </div>
            {files.length > 0 && (
                <ul className="space-y-1.5">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{f.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={disabled}
                                aria-label={`Remove ${f.name}`}
                                onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                            >
                                <X />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
