import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { tr } from "@/lib/i18n-options";

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
            toast({ title: tr("flashcards:toasts.generationReady"), description: tr("flashcards:toasts.generationReadyDescription", { count: e.created ?? 0 }), duration: 3000 });
        } else if (e.status === "FAILED") {
            toast({ title: tr("flashcards:toasts.generationFailed"), description: e.error ?? tr("common:actions.tryAgain"), variant: "error" });
        }
    });
};
