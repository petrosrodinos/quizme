import { forwardRef, useState } from "react";
import { BookA, Languages, Lightbulb, MessageSquareText, Quote, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageOptions } from "@/config/constants/dropdowns/ai-actions/language.options";
import { useWordLookup } from "@/features/ai-actions/hooks/use-ai-actions";
import { TextActions, type TextAction } from "@/features/ai-actions/interfaces/ai-actions.interfaces";
import type { ReaderSelection } from "../hooks/use-text-selection";

interface WordPopoverProps {
    projectId: string;
    selection: ReaderSelection;
    onAction: (action: TextAction) => void;
    onClose: () => void;
}

/** Inline dictionary for a word/short phrase: definition, contextual meaning, pronunciation, translation, example, related terms. */
export const WordPopover = forwardRef<HTMLDivElement, WordPopoverProps>(({ projectId, selection, onAction, onClose }, ref) => {
    const [language, setLanguage] = useState<string | undefined>(undefined);
    const { data, isPending, isError, error, refetch } = useWordLookup(projectId, selection.text, selection.context, language);
    const width = 340;
    const below = selection.rect.bottom + 8;
    const top = below + 320 > window.innerHeight ? Math.max(8, selection.rect.top - 330) : below;
    const left = Math.min(Math.max(8, selection.rect.left + selection.rect.width / 2 - width / 2), window.innerWidth - width - 8);

    const speak = () => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(selection.text));
    };

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label={`Definition of ${selection.text}`}
            className="fixed z-50 max-h-[min(420px,calc(100vh-16px))] overflow-y-auto rounded-xl border border-border bg-popover p-4 text-sm shadow-xl animate-in fade-in-0 zoom-in-95"
            style={{ top, left: Math.max(8, left), width: Math.min(width, window.innerWidth - 16) }}
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="truncate font-display text-xl">{selection.text}</div>
                    {data && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {data.pronunciation && <span className="font-mono">{data.pronunciation}</span>}
                            {data.part_of_speech && <span className="italic">{data.part_of_speech}</span>}
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={speak} aria-label="Pronounce">
                        <Volume2 />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close">
                        <X />
                    </Button>
                </div>
            </div>

            {isPending ? (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            ) : isError ? (
                <div className="space-y-2 text-muted-foreground">
                    <p>{error.message}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p>{data.definition}</p>
                    {data.contextual_meaning && (
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">In this context</div>
                            <p>{data.contextual_meaning}</p>
                        </div>
                    )}
                    {data.translation && (
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{language}</div>
                            <p>{data.translation}</p>
                        </div>
                    )}
                    {data.example && (
                        <p className="flex gap-2 italic text-muted-foreground">
                            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {data.example}
                        </p>
                    )}
                    {!!data.related_terms?.length && (
                        <div className="flex flex-wrap gap-1">
                            {data.related_terms.map((t) => (
                                <Badge key={t} variant="secondary" className="font-normal">
                                    {t}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => refetch()} title="Define">
                    <BookA /> Define
                </Button>
                <Select value={language ?? ""} onValueChange={(v) => setLanguage(v)}>
                    <SelectTrigger className="h-8 w-auto gap-1 border-none px-2 text-xs shadow-none" aria-label="Translate to">
                        <Languages className="h-4 w-4" />
                        <SelectValue placeholder="Translate" />
                    </SelectTrigger>
                    <SelectContent data-reader-keep="">
                        {LanguageOptions.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                                {l.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onAction(TextActions.EXPLAIN)}>
                    <Lightbulb /> Explain
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onAction(TextActions.EXAMPLE)}>
                    <Quote /> Example
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onAction(TextActions.ASK)}>
                    <MessageSquareText /> Ask AI
                </Button>
            </div>
        </div>
    );
});
WordPopover.displayName = "WordPopover";
