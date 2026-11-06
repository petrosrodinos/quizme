import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateRoom } from "@/features/rooms/hooks/use-rooms";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import type { StudyRoom } from "@/features/rooms/interfaces/rooms.interfaces";
import { createRoomSchema, type CreateRoomFormValues } from "../validation-schemas/rooms.schema";

interface CreateRoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projects: Project[];
    defaultProjectId?: string;
    onCreated: (room: StudyRoom) => void;
}

export const CreateRoomDialog = ({ open, onOpenChange, projects, defaultProjectId, onCreated }: CreateRoomDialogProps) => {
    const create = useCreateRoom();
    const form = useForm<CreateRoomFormValues>({ resolver: zodResolver(createRoomSchema), defaultValues: { project_id: defaultProjectId ?? "", name: "" } });

    useEffect(() => {
        if (open) form.reset({ project_id: defaultProjectId ?? projects[0]?.id ?? "", name: "" });
    }, [open, defaultProjectId, projects, form]);

    const submit = (v: CreateRoomFormValues) =>
        create.mutate(
            { projectId: v.project_id, name: v.name },
            {
                onSuccess: (room) => {
                    onOpenChange(false);
                    onCreated(room);
                },
            },
        );

    return (
        <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">New study room</DialogTitle>
                    <DialogDescription>Project members can join to chat, run a shared timer and play quizzes together.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="project_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project</FormLabel>
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger aria-label="Project">
                                                <SelectValue placeholder="Choose a project" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {projects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Room name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Evening revision" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={create.isPending}>
                                Create room
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
