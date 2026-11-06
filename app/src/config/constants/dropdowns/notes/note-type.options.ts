import { NoteTypes, type NoteType } from "@/features/notes/interfaces/notes.interfaces";
import { tOption } from "@/lib/i18n-options";

export const NoteTypeFormOptions: { id: NoteType; label: string }[] = [
    tOption(NoteTypes.NOTE, "notes:types.NOTE"),
    tOption(NoteTypes.HIGHLIGHT, "notes:types.HIGHLIGHT"),
    tOption(NoteTypes.ANNOTATION, "notes:types.ANNOTATION"),
    tOption(NoteTypes.BOOKMARK, "notes:types.BOOKMARK"),
    tOption(NoteTypes.QUESTION, "notes:types.QUESTION"),
];

export const NoteTypeFilterOptions: { id: NoteType | "all"; label: string }[] = [tOption("all", "notes:types.all"), ...NoteTypeFormOptions];

export const getNoteTypeLabel = (type: NoteType | string): string => NoteTypeFormOptions.find((o) => o.id === type)?.label ?? type;
