import type { NoteScope } from "@/features/notes/interfaces/notes.interfaces";

export const NoteScopeFilterOptions: { id: NoteScope; label: string }[] = [
    { id: "all", label: "Mine & shared" },
    { id: "mine", label: "Only mine" },
    { id: "shared", label: "Shared with project" },
];
