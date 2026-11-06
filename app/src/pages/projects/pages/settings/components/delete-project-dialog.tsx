import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DeleteProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectTitle: string;
    isPending: boolean;
    onConfirm: () => void;
}

/** Typed-confirmation delete (irreversible). */
export const DeleteProjectDialog = ({ open, onOpenChange, projectTitle, isPending, onConfirm }: DeleteProjectDialogProps) => {
    const [value, setValue] = useState("");
    useEffect(() => {
        if (open) setValue("");
    }, [open]);
    const matches = value.trim() === projectTitle.trim();
    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete this project permanently?</DialogTitle>
                    <DialogDescription>
                        All documents, quizzes, flashcards, notes and everyone's progress in this project will be deleted. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="confirm-title">
                        Type <span className="font-semibold">{projectTitle}</span> to confirm
                    </Label>
                    <Input id="confirm-title" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button variant="destructive" disabled={!matches} loading={isPending} onClick={onConfirm}>
                        Delete project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
