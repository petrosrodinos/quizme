import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberRoleRank } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useTranslation } from "react-i18next";

interface CopyToProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isPending: boolean;
    onConfirm: (projectId: string) => void;
}

/** Picks a destination project where the user can contribute. */
export const CopyToProjectDialog = ({ open, onOpenChange, isPending, onConfirm }: CopyToProjectDialogProps) => {
    const { t } = useTranslation("shared");
    const projects = useProjects({ view: "active" });
    const options = (projects.data ?? []).filter((p) => (MemberRoleRank[p.my_role] ?? 0) >= MemberRoleRank.CONTRIBUTOR);
    const [target, setTarget] = useState<string>("");

    useEffect(() => {
        if (open) setTarget("");
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("copyDialog.title")}</DialogTitle>
                    <DialogDescription>{t("copyDialog.description")}</DialogDescription>
                </DialogHeader>
                <Select value={target || undefined} onValueChange={setTarget} disabled={projects.isPending}>
                    <SelectTrigger aria-label={t("copyDialog.destination")}>
                        <SelectValue placeholder={projects.isPending ? t("copyDialog.loadingProjects") : options.length ? t("copyDialog.choose") : t("copyDialog.createFirst")} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                        {t("common:actions.cancel")}
                    </Button>
                    <Button disabled={!target} loading={isPending} onClick={() => onConfirm(target)}>
                        {t("common:actions.copy")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
