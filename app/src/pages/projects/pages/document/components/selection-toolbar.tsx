import { forwardRef, useEffect, useRef } from "react";
import { BookOpen, Brain, Highlighter, Layers, Lightbulb, ListChecks, MessageSquareText, MoreHorizontal, StickyNote, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TextActionOptions } from "@/config/constants/dropdowns/ai-actions/text-action.options";
import { HighlightColorOptions } from "@/config/constants/dropdowns/notes/highlight-color.options";
import { TextActions, type TextAction } from "@/features/ai-actions/interfaces/ai-actions.interfaces";
import { HighlightColorClass } from "../utils/highlight.utils";
import type { ReaderSelection } from "../hooks/use-text-selection";

interface SelectionToolbarProps {
    selection: ReaderSelection;
    onAction: (action: TextAction) => void;
    onCreateQuiz: () => void;
    onCreateFlashcards: () => void;
    onHighlight: (color: string) => void;
    onAddNote: () => void;
    busy?: boolean;
}

const PRIMARY: { action: TextAction; icon: typeof Lightbulb }[] = [
    { action: TextActions.EXPLAIN, icon: Lightbulb },
    { action: TextActions.SIMPLIFY, icon: Wand2 },
    { action: TextActions.SUMMARIZE, icon: BookOpen },
    { action: TextActions.ASK, icon: MessageSquareText },
];

const labelFor = (a: TextAction) => TextActionOptions.find((o) => o.id === a)?.label ?? a;

/** Floating contextual toolbar shown above a text selection. Keyboard: Tab into it, Escape to dismiss. */
export const SelectionToolbar = forwardRef<HTMLDivElement, SelectionToolbarProps>(
    ({ selection, onAction, onCreateQuiz, onCreateFlashcards, onHighlight, onAddNote, busy }, ref) => {
        const firstRef = useRef<HTMLButtonElement>(null);
        const width = 470;
        const top = Math.max(8, selection.rect.top - 52);
        const left = Math.min(Math.max(8, selection.rect.left + selection.rect.width / 2 - width / 2), window.innerWidth - width - 8);
        const secondary = TextActionOptions.filter((o) => !PRIMARY.some((p) => p.action === o.id));

        useEffect(() => {
            const onKey = (e: KeyboardEvent) => {
                if (e.altKey && e.key.toLowerCase() === "a") {
                    e.preventDefault();
                    firstRef.current?.focus();
                }
            };
            document.addEventListener("keydown", onKey);
            return () => document.removeEventListener("keydown", onKey);
        }, []);

        return (
            <div
                ref={ref}
                role="toolbar"
                aria-label="AI actions for selected text (Alt+A to focus)"
                className="fixed z-50 flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
                style={{ top, left: Math.max(8, left) }}
                onMouseDown={(e) => e.preventDefault()}
            >
                {PRIMARY.map(({ action, icon: Icon }, i) => (
                    <Button key={action} ref={i === 0 ? firstRef : undefined} variant="ghost" size="sm" className="h-8 shrink-0 px-2" onClick={() => onAction(action)} disabled={busy}>
                        <Icon /> <span className="hidden sm:inline">{labelFor(action)}</span>
                    </Button>
                ))}
                <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCreateQuiz} aria-label="Create quiz from selection" disabled={busy}>
                            <ListChecks />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create quiz</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCreateFlashcards} aria-label="Create flashcards from selection" disabled={busy}>
                            <Layers />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create flashcards</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Highlight selection">
                                    <Highlighter />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Highlight</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="center" onMouseDown={(e) => e.preventDefault()}>
                        <DropdownMenuLabel className="text-xs">Highlight colour</DropdownMenuLabel>
                        {HighlightColorOptions.map((c) => (
                            <DropdownMenuItem key={c.id} onClick={() => onHighlight(c.id)}>
                                <span className={`mr-2 h-3 w-3 rounded-full ${HighlightColorClass[c.id]}`} aria-hidden /> {c.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onAddNote} aria-label="Add note to selection">
                            <StickyNote />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add note</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="More AI actions" disabled={busy}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onMouseDown={(e) => e.preventDefault()}>
                        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                            <Brain className="h-3.5 w-3.5" /> More AI actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {secondary.map((o) => (
                            <DropdownMenuItem key={o.id} onClick={() => onAction(o.id)}>
                                <div>
                                    <div className="text-sm">{o.label}</div>
                                    <div className="text-xs text-muted-foreground">{o.description}</div>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    },
);
SelectionToolbar.displayName = "SelectionToolbar";
