import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExportFormatOptions } from "@/config/constants/dropdowns/exports/export-format.options";
import { useExport } from "@/features/exports/hooks/use-exports";
import type { ExportFormat, ExportType } from "@/features/exports/interfaces/exports.interfaces";
import { useTranslation } from "react-i18next";

interface ExportMenuProps {
    projectId: string;
    type: ExportType;
    deckId?: string;
    formats?: ExportFormat[];
    label?: string;
}

/** Download menu for project exports (CSV, JSON, Markdown, TXT, print-to-PDF). */
export const ExportMenu = ({ projectId, type, deckId, formats, label }: ExportMenuProps) => {
    const { t } = useTranslation("exports");
    const exporter = useExport();
    const options = formats ? ExportFormatOptions.filter((o) => formats.includes(o.id)) : ExportFormatOptions;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" loading={exporter.isPending}>
                    <Download /> {label ?? t("menu.button")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("menu.downloadAs")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((o) => (
                    <DropdownMenuItem key={o.id} onSelect={() => exporter.mutate({ projectId, type, format: o.id, deck_id: deckId })}>
                        {o.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
