import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportFormatFormOptions, ExportTypeFormOptions } from "@/config/constants/dropdowns/collaboration/export-form.options";
import { useExport } from "@/features/exports/hooks/use-exports";
import type { ExportFormat, ExportType } from "@/features/exports/interfaces/exports.interfaces";

export const ExportCenter = ({ projectId }: { projectId: string }) => {
    const exporter = useExport();
    const [format, setFormat] = useState<ExportFormat>("csv");
    const [busy, setBusy] = useState<ExportType | null>(null);

    const run = (type: ExportType) => {
        setBusy(type);
        exporter.mutate({ projectId, type, format }, { onSettled: () => setBusy(null) });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground" id="export-format-label">
                    Format
                </span>
                <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                    <SelectTrigger className="w-56" aria-labelledby="export-format-label">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ExportFormatFormOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border">
                {ExportTypeFormOptions.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{o.label}</p>
                            <p className="text-xs text-muted-foreground">{o.description}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => run(o.id)} loading={busy === o.id} disabled={!!busy && busy !== o.id} aria-label={`Export ${o.label}`}>
                            <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
