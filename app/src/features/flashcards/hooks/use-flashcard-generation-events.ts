import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";

interface GenerationStatusEvent {
    kind: string;
    id: string;
    project_id: string;
    status: string;
    created?: number;
    error?: string | null;
}

/** Listens for background flashcard generation results for a project and refreshes the card lists. */
export const useFlashcardGenerationEvents = (projectId: string | undefined) => {
    const queryClient = useQueryClient();
    useRealtimeEvent<GenerationStatusEvent>(RealtimeEvents.GENERATION_STATUS, (e) => {
        if (e.kind !== "flashcards" || (projectId && e.project_id !== projectId)) return;
        if (e.status === "READY") {
            queryClient.invalidateQueries({ queryKey: ["flashcards"] });
            queryClient.invalidateQueries({ queryKey: ["decks"] });
            queryClient.invalidateQueries({ queryKey: ["flashcard-stats"] });
            toast({ title: "Flashcards ready", description: `${e.created ?? 0} new card${e.created === 1 ? "" : "s"} added.`, duration: 3000 });
        } else if (e.status === "FAILED") {
            toast({ title: "Flashcard generation failed", description: e.error ?? "Please try again.", variant: "error" });
        }
    });
};
