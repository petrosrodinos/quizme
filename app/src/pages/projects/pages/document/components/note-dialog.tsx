import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoteTypes, type NoteType } from "@/features/notes/interfaces/notes.interfaces";

interface NoteDialogProps {
    open: boolean;
    selectionText: string;
    isPending?: boolean;
    onClose: () => void;
    onSave: (type: NoteType, content: string) => void;
}

/** Quick annotation / question / bookmark on the selected passage. */
export const NoteDialog = ({ open, selectionText, isPending, onClose, onSave }: NoteDialogProps) => {
    const [content, setContent] = useState("");
    const [type, setType] = useState<NoteType>(NoteTypes.ANNOTATION);
    useEffect(() => {
        if (open) {
            setContent("");
            setType(NoteTypes.ANNOTATION);
        }
    }, [open]);
    const requiresText = type !== NoteTypes.BOOKMARK;
    return (
        <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
            <DialogContent className="sm:max-w-lg" data-reader-keep="">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl font-normal">Add to your notes</DialogTitle>
                    <DialogDescription asChild>
                        <blockquote className="line-clamp-3 border-l-2 border-primary/50 pl-3 italic">{selectionText}</blockquote>
                    </DialogDescription>
                </DialogHeader>
                <Tabs value={type} onValueChange={(v) => setType(v as NoteType)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value={NoteTypes.ANNOTATION}>Annotation</TabsTrigger>
                        <TabsTrigger value={NoteTypes.QUESTION}>Question</TabsTrigger>
                        <TabsTrigger value={NoteTypes.BOOKMARK}>Bookmark</TabsTrigger>
                    </TabsList>
                </Tabs>
                {requiresText && (
                    <div className="space-y-1.5">
                        <Label htmlFor="note-content">{type === NoteTypes.QUESTION ? "Your question" : "Your note"}</Label>
                        <Textarea id="note-content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
                    </div>
                )}
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={() => onSave(type, requiresText ? content.trim() : selectionText.slice(0, 500))} disabled={requiresText && !content.trim()} loading={isPending}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
