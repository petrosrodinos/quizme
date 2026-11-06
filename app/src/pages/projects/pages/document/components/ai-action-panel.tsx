import { useEffect, useState } from "react";
import { Check, Copy, Play, Save, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/ui/markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTextActionLabel } from "@/config/constants/dropdowns/ai-actions/text-action.options";
import { LanguageOptions } from "@/config/constants/dropdowns/ai-actions/language.options";
import { useTextAction } from "@/features/ai-actions/hooks/use-ai-actions";
import { TextActions, type TextAction } from "@/features/ai-actions/interfaces/ai-actions.interfaces";
import { useCreateReaderNote } from "@/features/notes/hooks/use-reader-notes";
import { NoteTypes } from "@/features/notes/interfaces/notes.interfaces";
import { useTranslation } from "react-i18next";

export interface ActionRequest {
    action: TextAction;
    text: string;
    chunkId: string | null;
    page: number | null;
}

interface AiActionPanelProps {
    projectId: string;
    documentId: string;
    request: ActionRequest | null;
    onClose: () => void;
}

const NEEDS_INPUT: TextAction[] = [TextActions.TRANSLATE, TextActions.COMPARE, TextActions.ASK];

/** Side panel that runs a contextual AI action on the selected text and shows the Markdown result. */
export const AiActionPanel = ({ projectId, documentId, request, onClose }: AiActionPanelProps) => {
    const { t } = useTranslation("reader");
    const run = useTextAction();
    const saveNote = useCreateReaderNote();
    const [language, setLanguage] = useState("English");
    const [compareWith, setCompareWith] = useState("");
    const [question, setQuestion] = useState("");
    const [copied, setCopied] = useState(false);
    const { reset, mutate } = run;

    const execute = (req: ActionRequest) =>
        mutate({
            projectId,
            dto: {
                action: req.action,
                text: req.text,
                document_id: documentId,
                language: req.action === TextActions.TRANSLATE ? language : undefined,
                compare_with: req.action === TextActions.COMPARE ? compareWith.trim() || undefined : undefined,
                question: req.action === TextActions.ASK ? question.trim() || undefined : undefined,
            },
        });

    useEffect(() => {
        reset();
        setCopied(false);
        setQuestion("");
        setCompareWith("");
        if (request && !NEEDS_INPUT.includes(request.action)) execute(request);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    const content = run.data?.content ?? "";
    const copy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg" data-reader-keep="">
                {request && (
                    <>
                        <SheetHeader className="border-b border-border p-5 text-left">
                            <SheetTitle className="flex items-center gap-2 font-display text-xl font-normal">
                                <Sparkles className="h-4 w-4 text-primary" /> {getTextActionLabel(request.action)}
                            </SheetTitle>
                            <SheetDescription asChild>
                                <blockquote className="line-clamp-4 border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground">{request.text}</blockquote>
                            </SheetDescription>
                        </SheetHeader>
                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                            {NEEDS_INPUT.includes(request.action) && (
                                <form
                                    className="space-y-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        execute(request);
                                    }}
                                >
                                    {request.action === TextActions.TRANSLATE && (
                                        <>
                                            <Label htmlFor="ai-lang">{t("panel.translateInto")}</Label>
                                            <Select value={language} onValueChange={setLanguage}>
                                                <SelectTrigger id="ai-lang" aria-label={t("panel.targetLanguage")}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent data-reader-keep="">
                                                    {LanguageOptions.map((l) => (
                                                        <SelectItem key={l.id} value={l.id}>
                                                            {l.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </>
                                    )}
                                    {request.action === TextActions.COMPARE && (
                                        <>
                                            <Label htmlFor="ai-compare">{t("panel.compareWith")}</Label>
                                            <Input id="ai-compare" value={compareWith} onChange={(e) => setCompareWith(e.target.value)} placeholder={t("panel.comparePlaceholder")} autoFocus />
                                        </>
                                    )}
                                    {request.action === TextActions.ASK && (
                                        <>
                                            <Label htmlFor="ai-question">{t("panel.yourQuestion")}</Label>
                                            <Textarea
                                                id="ai-question"
                                                rows={3}
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                placeholder={t("panel.questionPlaceholder")}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) execute(request);
                                                }}
                                            />
                                        </>
                                    )}
                                    <Button
                                        type="submit"
                                        size="sm"
                                        loading={run.isPending}
                                        disabled={(request.action === TextActions.ASK && !question.trim()) || (request.action === TextActions.COMPARE && !compareWith.trim())}
                                    >
                                        <Play /> {t("panel.run")}
                                    </Button>
                                </form>
                            )}
                            {run.isPending && (
                                <div className="space-y-2" aria-busy="true" aria-label={t("panel.generating")}>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-11/12" />
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-3/5" />
                                </div>
                            )}
                            {run.isError && (
                                <div className="space-y-2 text-sm text-destructive">
                                    <p>{run.error.message}</p>
                                    <Button size="sm" variant="outline" onClick={() => execute(request)}>
                                        {t("panel.retry")}
                                    </Button>
                                </div>
                            )}
                            {content && !run.isPending && <Markdown content={content} className="prose-study" />}
                        </div>
                        {content && !run.isPending && (
                            <div className="flex items-center justify-between gap-2 border-t border-border p-4">
                                <span className="text-xs text-muted-foreground">{run.data?.cached ? t("panel.cached") : run.data?.model}</span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={copy}>
                                        {copied ? <Check /> : <Copy />} {copied ? t("panel.copied") : t("panel.copy")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        loading={saveNote.isPending}
                                        onClick={() =>
                                            saveNote.mutate({
                                                projectId,
                                                dto: {
                                                    type: NoteTypes.NOTE,
                                                    title: t("panel.noteTitle", { action: getTextActionLabel(request.action), excerpt: request.text.slice(0, 60) }),
                                                    content,
                                                    document_id: documentId,
                                                    chunk_id: request.chunkId ?? undefined,
                                                    page: request.page ?? undefined,
                                                    selection_text: request.text.slice(0, 2000),
                                                },
                                            })
                                        }
                                    >
                                        <Save /> {t("panel.saveAsNote")}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};
