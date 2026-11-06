import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { GraduationCap, HelpCircle, MessageSquarePlus, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import { useCreateThread, useDeleteThread, useSendMessage, useThreadMessages, useThreads, useUpdateThread } from "@/features/tutor/hooks/use-tutor";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import { ChatModes, type ChatMode, type ChatThread } from "@/features/tutor/interfaces/tutor.interfaces";
import { ChatModeFormOptions, TutorSuggestedPromptOptions, getChatModeLabel } from "@/config/constants/dropdowns/tutor/chat-mode.options";
import { ChatMessage } from "./components/chat-message";
import { useTranslation } from "react-i18next";

const ANY = "any";

export default function ProjectTutorPage() {
    const { t } = useTranslation("tutor");
    usePageMetadata({ title: t("page.title") });
    const { projectId, project } = useProjectContext();
    const { data: threads = [], isPending: threadsPending } = useThreads(projectId);
    const { data: documents = [] } = useDocuments(projectId);
    const { flat: topics } = useFlatTopics(projectId);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [mode, setMode] = useState<ChatMode>(ChatModes.TUTOR);
    const [draft, setDraft] = useState("");
    const [docScope, setDocScope] = useState<string>(ANY);
    const [topicScope, setTopicScope] = useState<string>(ANY);
    const [renaming, setRenaming] = useState<ChatThread | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [toDelete, setToDelete] = useState<ChatThread | null>(null);
    const { data: thread, isPending: messagesPending } = useThreadMessages(activeId);
    const createThread = useCreateThread();
    const updateThread = useUpdateThread();
    const deleteThread = useDeleteThread();
    const send = useSendMessage();
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const activeThread = threads.find((th) => th.id === activeId) ?? thread?.thread ?? null;
    const activeMode = activeThread?.mode ?? mode;
    const messages = thread?.messages ?? [];
    const pendingText = send.isPending && send.variables?.threadId === activeId && !messages.some((m) => m.id.startsWith("temp-")) ? send.variables?.dto.content : null;

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages.length, send.isPending, activeId]);

    const submit = async (text?: string) => {
        const content = (text ?? draft).trim();
        if (!content || send.isPending) return;
        let threadId = activeId;
        if (!threadId) {
            const created = await createThread.mutateAsync({ projectId, mode }).catch(() => null);
            if (!created) return;
            threadId = created.id;
            setActiveId(created.id);
        }
        setDraft("");
        send.mutate({
            threadId,
            dto: { content, document_id: docScope === ANY ? undefined : docScope, topic_id: topicScope === ANY ? undefined : topicScope },
        });
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
        }
    };

    const applyPrompt = (label: string) => {
        if (label.endsWith(" ")) {
            setDraft(label);
            inputRef.current?.focus();
        } else void submit(label);
    };

    const newChat = () => {
        setActiveId(null);
        setDraft("");
        inputRef.current?.focus();
    };

    const switchMode = (m: ChatMode) => {
        if (activeThread) updateThread.mutate({ id: activeThread.id, mode: m });
        else setMode(m);
    };

    return (
        <Main width="full" className="pb-4">
            <div className="grid h-[calc(100dvh-13rem)] min-h-[520px] gap-4 lg:grid-cols-[260px_1fr]">
                <aside aria-label={t("threads.title")} className="hidden flex-col rounded-xl border border-border bg-card lg:flex">
                    <div className="border-b border-border p-3">
                        <Button className="w-full" variant="outline" onClick={newChat}>
                            <MessageSquarePlus /> {t("threads.newChat")}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {threadsPending ? (
                            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mb-2 h-12 w-full" />)
                        ) : !threads.length ? (
                            <p className="p-3 text-sm text-muted-foreground">{t("threads.empty")}</p>
                        ) : (
                            threads.map((th) => (
                                <div key={th.id} className={cn("group flex items-center rounded-md", activeId === th.id ? "bg-surface-card" : "hover:bg-muted")}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveId(th.id)}
                                        aria-current={activeId === th.id}
                                        className="min-w-0 flex-1 rounded-md px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span className="block truncate text-sm">{th.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {getChatModeLabel(th.mode)} · {formatRelative(th.updated_at)}
                                        </span>
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 group-hover:opacity-100" aria-label={t("threads.actionsFor", { title: th.title })}>
                                                <MoreHorizontal />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onSelect={() => {
                                                    setRenaming(th);
                                                    setRenameValue(th.title);
                                                }}
                                            >
                                                <Pencil /> {t("common:actions.rename")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(th)}>
                                                <Trash2 /> {t("common:actions.delete")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                <section aria-label={t("chat.ariaLabel")} className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
                    <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                        <div className="lg:hidden">
                            <Select value={activeId ?? "new"} onValueChange={(v) => (v === "new" ? newChat() : setActiveId(v))}>
                                <SelectTrigger className="w-44" aria-label={t("threads.select")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">{t("threads.newChat")}</SelectItem>
                                    {threads.map((th) => (
                                        <SelectItem key={th.id} value={th.id}>
                                            {th.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div role="radiogroup" aria-label={t("chat.modeGroup")} className="inline-flex rounded-lg bg-muted p-0.5">
                            {ChatModeFormOptions.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={activeMode === o.id}
                                    title={o.description}
                                    onClick={() => switchMode(o.id)}
                                    className={cn(
                                        "rounded-md px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        activeMode === o.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground",
                                    )}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex flex-wrap gap-2">
                            <Select value={docScope} onValueChange={setDocScope}>
                                <SelectTrigger className="h-8 w-auto min-w-36 max-w-56 text-xs" aria-label={t("chat.limitDocument")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANY}>{t("chat.allDocuments")}</SelectItem>
                                    {documents
                                        .filter((d) => d.status === "READY")
                                        .map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.filename}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <Select value={topicScope} onValueChange={setTopicScope}>
                                <SelectTrigger className="h-8 w-auto min-w-36 max-w-56 text-xs" aria-label={t("chat.limitTopic")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANY}>{t("chat.allTopics")}</SelectItem>
                                    {topics.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.depth ? "↳ " : ""}
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </header>

                    <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4" aria-live="polite">
                        {activeId && messagesPending ? (
                            <div className="space-y-4">
                                <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
                                <Skeleton className="h-24 w-3/4 rounded-2xl" />
                            </div>
                        ) : !messages.length && !pendingText ? (
                            <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-card">
                                    {activeMode === ChatModes.SOCRATIC ? <HelpCircle className="h-6 w-6 text-primary" /> : <GraduationCap className="h-6 w-6 text-primary" />}
                                </div>
                                <h2 className="font-display text-2xl">{activeMode === ChatModes.SOCRATIC ? t("empty.socraticTitle") : t("empty.tutorTitle", { title: project.title })}</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {activeMode === ChatModes.SOCRATIC ? t("empty.socraticDescription") : t("empty.tutorDescription")}
                                </p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    {TutorSuggestedPromptOptions.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => applyPrompt(p.label)}
                                            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {p.label.trim()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((m) => (
                                    <ChatMessage key={m.id} message={m} projectId={projectId} />
                                ))}
                                {pendingText && (
                                    <ChatMessage
                                        message={{ id: "pending", thread_id: activeId ?? "", role: "USER", content: pendingText, citations: null, grounded: true, model: null, created_at: "" }}
                                        projectId={projectId}
                                    />
                                )}
                            </>
                        )}
                        {send.isPending && (
                            <div className="flex items-center gap-3" role="status">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card" aria-hidden>
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex gap-1 rounded-2xl border border-border bg-card px-4 py-3">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none" style={{ animationDelay: `${i * 120}ms` }} />
                                    ))}
                                    <span className="sr-only">{t("chat.typing")}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form
                        className="border-t border-border p-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void submit();
                        }}
                    >
                        <div className="flex items-end gap-2">
                            <Textarea
                                ref={inputRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={2}
                                maxLength={6000}
                                placeholder={activeMode === ChatModes.SOCRATIC ? t("chat.socraticPlaceholder") : t("chat.placeholder")}
                                aria-label={t("chat.message")}
                                className="max-h-48 min-h-12 resize-none"
                            />
                            <Button type="submit" size="icon" aria-label={t("common:actions.send")} disabled={!draft.trim() || send.isPending || createThread.isPending}>
                                <Send />
                            </Button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t("chat.keyboardHint")}</p>
                    </form>
                </section>
            </div>

            <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("threads.renameTitle")}</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (renaming && renameValue.trim()) updateThread.mutate({ id: renaming.id, title: renameValue.trim() }, { onSuccess: () => setRenaming(null) });
                        }}
                        className="space-y-4"
                    >
                        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={120} autoFocus aria-label={t("threads.titleField")} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={updateThread.isPending} disabled={!renameValue.trim()}>
                                {t("common:actions.save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() =>
                    toDelete &&
                    deleteThread.mutate(toDelete.id, {
                        onSuccess: () => {
                            if (activeId === toDelete.id) setActiveId(null);
                            setToDelete(null);
                        },
                    })
                }
                title={t("confirm.deleteTitle")}
                description={t("confirm.deleteDescription")}
                confirmText={t("common:actions.delete")}
                variant="destructive"
                isLoading={deleteThread.isPending}
            />
        </Main>
    );
}
