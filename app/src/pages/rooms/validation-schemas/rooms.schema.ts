import { z } from "zod";

export const createRoomSchema = z.object({
    project_id: z.string().min(1, "Choose a project"),
    name: z.string().trim().min(1, "Give the room a name").max(80),
});
export type CreateRoomFormValues = z.infer<typeof createRoomSchema>;
