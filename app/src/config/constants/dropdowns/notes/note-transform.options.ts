import type { NoteTransformTarget } from "@/features/notes/interfaces/notes.interfaces";
import { tr } from "@/lib/i18n-options";

const transform = (id: NoteTransformTarget) => ({
    id,
    get label(): string {
        return tr(`notes:transform.targets.${id}.label`);
    },
    get description(): string {
        return tr(`notes:transform.targets.${id}.description`);
    },
});

export const NoteTransformOptions: { id: NoteTransformTarget; label: string; description: string }[] = [
    transform("flashcards"),
    transform("quiz"),
    transform("summary"),
    transform("study_guide"),
];
