import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { saveRoomNotes } from "@/features/rooms/services/rooms.services";
import { translateRoomError } from "@/features/rooms/utils/room-errors.utils";
import { useTranslation } from "react-i18next";

interface RoomNotesProps {
    roomId: string;
    /** Latest server content (remote updates). */
    content: string;
}

/** Shared notes synced over the socket. Remote edits apply only while the local editor isn't focused. */
export const RoomNotes = ({ roomId, content }: RoomNotesProps) => {
    const { t } = useTranslation("rooms");
    const [value, setValue] = useState(content);
    const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
    const focused = useRef(false);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (!focused.current) setValue(content);
    }, [content]);

    useEffect(() => () => {
        if (timer.current) window.clearTimeout(timer.current);
    }, []);

    const onChange = (next: string) => {
        setValue(next);
        setStatus("saving");
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            saveRoomNotes(roomId, next)
                .then(() => setStatus("saved"))
                .catch((e: Error) => {
                    setStatus("idle");
                    toast({ title: t("notes.saveFailed"), description: translateRoomError(e.message), variant: "error" });
                });
        }, 700);
    };

    return (
        <section aria-labelledby="room-notes" className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
                <h2 id="room-notes" className="font-medium">
                    {t("notes.title")}
                </h2>
                <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
                    {status === "saving" ? (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" /> {t("common:status.saving")}
                        </>
                    ) : status === "saved" ? (
                        <>
                            <Check className="h-3 w-3" /> {t("common:status.saved")}
                        </>
                    ) : null}
                </span>
            </div>
            <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => (focused.current = true)}
                onBlur={() => {
                    focused.current = false;
                }}
                rows={10}
                placeholder={t("notes.placeholder")}
                aria-labelledby="room-notes"
                className="font-mono text-sm"
            />
        </section>
    );
};
