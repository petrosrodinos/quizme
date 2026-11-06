import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateNoteDto, Note, NotesQuery, NoteTransformResult, NoteTransformTarget, NoteWithRelations, UpdateNoteDto } from "../interfaces/notes.interfaces";

export const getNotes = (projectId: string, query: NotesQuery) =>
    withApiError(async () => (await axiosInstance.get<NoteWithRelations[]>(ApiRoutes.notes.by_project(projectId), { params: query })).data, "Failed to load notes.");

export const createNote = ({ projectId, dto }: { projectId: string; dto: CreateNoteDto }) =>
    withApiError(async () => (await axiosInstance.post<Note>(ApiRoutes.notes.by_project(projectId), dto)).data, "Failed to save note.");

export const updateNote = ({ id, dto }: { id: string; dto: UpdateNoteDto }) =>
    withApiError(async () => (await axiosInstance.patch<Note>(ApiRoutes.notes.detail(id), dto)).data, "Failed to update note.");

export const deleteNote = (id: string) => withApiError(async () => (await axiosInstance.delete(ApiRoutes.notes.detail(id))).data, "Failed to delete note.");

export const transformNotes = ({ projectId, note_ids, target }: { projectId: string; note_ids: string[]; target: NoteTransformTarget }) =>
    withApiError(
        async () => (await axiosInstance.post<NoteTransformResult>(ApiRoutes.notes.transform(projectId), { note_ids, target })).data,
        "Failed to transform notes.",
    );
