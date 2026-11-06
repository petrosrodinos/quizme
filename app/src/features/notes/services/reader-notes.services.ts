import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { CreateNoteDto, Note, NotesQuery } from "../interfaces/notes.interfaces";

/** Notes payloads may be a plain array or a paginated `{ data }` envelope — normalize to an array. */
const unwrap = (data: Note[] | { data: Note[] }): Note[] => (Array.isArray(data) ? data : data?.data ?? []);

export const getReaderNotes = (projectId: string, query: NotesQuery) =>
    withApiError(async () => unwrap((await axiosInstance.get(ApiRoutes.reader_notes.list(projectId), { params: query })).data), "Failed to load notes.");

export const createReaderNote = ({ projectId, dto }: { projectId: string; dto: CreateNoteDto }) =>
    withApiError(async () => (await axiosInstance.post<Note>(ApiRoutes.reader_notes.list(projectId), dto)).data, "Failed to save note.");
