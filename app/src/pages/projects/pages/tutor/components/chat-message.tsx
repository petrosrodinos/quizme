import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Info } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import type { ChatMessage as Message, Citation } from "@/features/tutor/interfaces/tutor.interfaces";
import { useTranslation } from "react-i18next";

const citationLabel = (c: Citation, pageShort: (page: number) => string) => `${c.document_title}${c.page ? `, ${pageShort(c.page)}` : ""}`;

/** One chat bubble. Assistant replies render Markdown with clickable source chips. */
export const ChatMessage = ({ message, projectId }: { message: Message; projectId: string }) => {
    const { t } = useTranslation("tutor");
    const pageShort = (page: number) => t("citations.pageShort", { page });
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const isUser = message.role === "USER";
    const citations = message.citations ?? [];

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{message.content}</div>
            </div>
        );
    }

    return (
        <div className="flex gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-card" aria-hidden>
                <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 max-w-[90%] flex-1">
                <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3">
                    <Markdown
                        content={message.content}
                        className="prose-study text-sm"
                        citations={citations.map((c) => ({ index: c.index, label: citationLabel(c, pageShort), onClick: () => setOpenIndex(c.index) }))}
                    />
                </div>
                {!message.grounded && (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-xs text-amber">
                        <Info className="h-3 w-3" aria-hidden /> {t("citations.notGrounded")}
                    </p>
                )}
                {citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label={t("citations.sources")}>
                        {citations.map((c) => (
                            <Popover key={c.index} open={openIndex === c.index} onOpenChange={(o) => setOpenIndex(o ? c.index : null)}>
                                <PopoverAnchor asChild>
                                    <button
                                        type="button"
                                        onClick={() => setOpenIndex(openIndex === c.index ? null : c.index)}
                                        className={cn(
                                            "inline-flex max-w-64 items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            openIndex === c.index && "border-primary/60 text-foreground",
                                        )}
                                    >
                                        <span className="font-semibold text-primary">{c.index}</span>
                                        <span className="truncate">{citationLabel(c, pageShort)}</span>
                                    </button>
                                </PopoverAnchor>
                                <PopoverContent className="w-80 text-sm" align="start">
                                    <p className="font-medium">{c.document_title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {[c.section, c.page ? t("citations.page", { page: c.page }) : null].filter(Boolean).join(" · ") || t("citations.passage")}
                                    </p>
                                    {c.quote && <blockquote className="mt-2 max-h-40 overflow-y-auto border-l-2 border-primary/40 pl-2 text-xs italic">{c.quote}…</blockquote>}
                                    <Link to={Routes.projects.document(projectId, c.document_id)} className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                        <BookOpen className="h-3 w-3" aria-hidden /> {t("citations.openInReader")}
                                    </Link>
                                </PopoverContent>
                            </Popover>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
