import { NoteTypes, type NoteType } from "@/features/notes/interfaces/notes.interfaces";

export const NoteTypeFormOptions: { id: NoteType; label: string }[] = [
    { id: NoteTypes.NOTE, label: "Note" },
    { id: NoteTypes.HIGHLIGHT, label: "Highlight" },
    { id: NoteTypes.ANNOTATION, label: "Annotation" },
    { id: NoteTypes.BOOKMARK, label: "Bookmark" },
    { id: NoteTypes.QUESTION, label: "Question" },
];

export const NoteTypeFilterOptions: { id: NoteType | "all"; label: string }[] = [{ id: "all", label: "All types" }, ...NoteTypeFormOptions];

export const getNoteTypeLabel = (type: NoteType | string): string => NoteTypeFormOptions.find((o) => o.id === type)?.label ?? type;
