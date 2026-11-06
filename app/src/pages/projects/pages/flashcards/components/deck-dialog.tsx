import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Deck, DeckDto } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { deckFormSchema, type DeckFormValues } from "../validation-schemas/flashcard.schema";

interface DeckDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deck: Deck | null;
    isPending?: boolean;
    onSubmit: (dto: DeckDto) => void;
}

export const DeckDialog = ({ open, onOpenChange, deck, isPending, onSubmit }: DeckDialogProps) => {
    const form = useForm<DeckFormValues>({ resolver: zodResolver(deckFormSchema), defaultValues: { name: "", description: "" } });

    useEffect(() => {
        if (open) form.reset({ name: deck?.name ?? "", description: deck?.description ?? "" });
    }, [open, deck, form]);

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{deck ? "Rename deck" : "New deck"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => onSubmit({ name: v.name.trim(), description: v.description?.trim() || undefined }))} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input autoFocus placeholder="Chapter 4 — Cell energy" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={isPending}>
                                {deck ? "Save" : "Create deck"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
