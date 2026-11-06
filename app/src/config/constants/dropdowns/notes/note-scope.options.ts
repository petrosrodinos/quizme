import type { NoteScope } from "@/features/notes/interfaces/notes.interfaces";
import { tOption } from "@/lib/i18n-options";

export const NoteScopeFilterOptions: { id: NoteScope; label: string }[] = [
    tOption("all", "notes:scope.all"),
    tOption("mine", "notes:scope.mine"),
    tOption("shared", "notes:scope.shared"),
];
