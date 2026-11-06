import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateNoteDto, Note, NotesQuery, NoteTransformResult, NoteTransformTarget, NoteWithRelations, UpdateNoteDto } from "../interfaces/notes.interfaces";
import { tr } from "@/lib/i18n-options";

export const getNotes = (projectId: string, query: NotesQuery) =>
    withApiError(async () => (await axiosInstance.get<NoteWithRelations[]>(ApiRoutes.notes.by_project(projectId), { params: query })).data, tr("notes:errors.load"));

export const createNote = ({ projectId, dto }: { projectId: string; dto: CreateNoteDto }) =>
    withApiError(async () => (await axiosInstance.post<Note>(ApiRoutes.notes.by_project(projectId), dto)).data, tr("notes:errors.save"));

export const updateNote = ({ id, dto }: { id: string; dto: UpdateNoteDto }) =>
    withApiError(async () => (await axiosInstance.patch<Note>(ApiRoutes.notes.detail(id), dto)).data, tr("notes:errors.update"));

export const deleteNote = (id: string) => withApiError(async () => (await axiosInstance.delete(ApiRoutes.notes.detail(id))).data, tr("notes:errors.delete"));

export const transformNotes = ({ projectId, note_ids, target }: { projectId: string; note_ids: string[]; target: NoteTransformTarget }) =>
    withApiError(
        async () => (await axiosInstance.post<NoteTransformResult>(ApiRoutes.notes.transform(projectId), { note_ids, target })).data,
        tr("notes:errors.transform"),
    );
