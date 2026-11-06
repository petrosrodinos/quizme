import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trans, useTranslation } from "react-i18next";

interface DeleteProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectTitle: string;
    isPending: boolean;
    onConfirm: () => void;
}

/** Typed-confirmation delete (irreversible). */
export const DeleteProjectDialog = ({ open, onOpenChange, projectTitle, isPending, onConfirm }: DeleteProjectDialogProps) => {
    const { t } = useTranslation("projectSettings");
    const [value, setValue] = useState("");
    useEffect(() => {
        if (open) setValue("");
    }, [open]);
    const matches = value.trim() === projectTitle.trim();
    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("deleteDialog.description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="confirm-title">
                        <Trans t={t} i18nKey="deleteDialog.typeToConfirm" values={{ title: projectTitle }} components={{ b: <span className="font-semibold" /> }} />
                    </Label>
                    <Input id="confirm-title" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                        {t("common:actions.cancel")}
                    </Button>
                    <Button variant="destructive" disabled={!matches} loading={isPending} onClick={onConfirm}>
                        {t("danger.delete")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
