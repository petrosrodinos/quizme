import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";

export interface GenerateFlashcardsDto {
    count: number;
    selection_text?: string;
    document_ids?: string[];
    topic_ids?: string[];
    deck_id?: string;
    selection_document_id?: string;
    note_ids?: string[];
    instructions?: string;
}

export const generateFlashcards = ({ projectId, dto }: { projectId: string; dto: GenerateFlashcardsDto }) =>
    withApiError(
        async () => (await axiosInstance.post<{ job_id: string }>(ApiRoutes.flashcard_generation.generate(projectId), dto)).data,
        "Failed to start flashcard generation.",
    );
