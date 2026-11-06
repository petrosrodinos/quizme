import type { NoteTransformTarget } from "@/features/notes/interfaces/notes.interfaces";

export const NoteTransformOptions: { id: NoteTransformTarget; label: string; description: string }[] = [
    { id: "flashcards", label: "Flashcards", description: "Turn the selected notes into spaced-repetition cards" },
    { id: "quiz", label: "Quiz", description: "Generate a practice quiz from the notes" },
    { id: "summary", label: "Summary", description: "A concise summary saved as a new note" },
    { id: "study_guide", label: "Study guide", description: "A structured study guide saved as a new note" },
];
