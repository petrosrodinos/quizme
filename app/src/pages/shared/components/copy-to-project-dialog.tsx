import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberRoleRank } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useProjects } from "@/features/projects/hooks/use-projects";

interface CopyToProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isPending: boolean;
    onConfirm: (projectId: string) => void;
}

/** Picks a destination project where the user can contribute. */
export const CopyToProjectDialog = ({ open, onOpenChange, isPending, onConfirm }: CopyToProjectDialogProps) => {
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
                    <DialogTitle>Copy to one of your projects</DialogTitle>
                    <DialogDescription>The copy is yours to edit and study; the original stays unchanged.</DialogDescription>
                </DialogHeader>
                <Select value={target || undefined} onValueChange={setTarget} disabled={projects.isPending}>
                    <SelectTrigger aria-label="Destination project">
                        <SelectValue placeholder={projects.isPending ? "Loading projects…" : options.length ? "Choose a project" : "Create a project first"} />
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
                        Cancel
                    </Button>
                    <Button disabled={!target} loading={isPending} onClick={() => onConfirm(target)}>
                        Copy
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
