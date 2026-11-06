import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { UserAvatar } from "@/components/ui/user-avatar";
import { displayName } from "@/lib/display-name";
import { formatRelative } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useSendRoomMessage } from "@/features/rooms/hooks/use-rooms";
import type { RoomMessage } from "@/features/rooms/interfaces/rooms.interfaces";

interface RoomChatProps {
    roomId: string;
    myId: string | undefined;
    messages: RoomMessage[];
    disabled?: boolean;
}

export const RoomChat = ({ roomId, myId, messages, disabled }: RoomChatProps) => {
    const send = useSendRoomMessage(roomId);
    const [text, setText] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const content = text.trim();
        if (!content) return;
        send.mutate(content, { onSuccess: () => setText("") });
    };

    return (
        <section aria-label="Room chat" className="flex h-[28rem] flex-col rounded-xl border border-border bg-card lg:h-[34rem]">
            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
                {!messages.length ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                        Say hi! Ask the AI tutor with <code className="rounded bg-muted px-1">@tutor your question</code>.
                    </p>
                ) : (
                    messages.map((m) => {
                        const mine = m.user_id === myId && !m.is_ai;
                        const name = m.is_ai ? "AI tutor" : displayName(m.user);
                        return (
                            <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                                {m.is_ai ? (
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden>
                                        <Bot className="h-4 w-4" />
                                    </span>
                                ) : (
                                    <UserAvatar name={name} src={m.user.avatar_url} className="h-8 w-8" />
                                )}
                                <div className={cn("max-w-[80%] space-y-1", mine && "items-end text-right")}>
                                    <p className="text-xs text-muted-foreground">
                                        {mine ? "You" : name} · {formatRelative(m.created_at)}
                                    </p>
                                    <div
                                        className={cn(
                                            "inline-block rounded-2xl px-3.5 py-2 text-left text-sm",
                                            m.is_ai ? "border border-primary/30 bg-primary/5" : mine ? "bg-primary text-primary-foreground" : "bg-surface-card",
                                        )}
                                    >
                                        {m.is_ai ? <Markdown content={m.content} className="text-sm" /> : <span className="whitespace-pre-wrap break-words">{m.content}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Message the room… (@tutor to ask the AI)"
                    aria-label="Message"
                    maxLength={2000}
                    disabled={disabled}
                />
                <Button type="submit" size="icon" aria-label="Send message" loading={send.isPending} disabled={disabled || !text.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </section>
    );
};
