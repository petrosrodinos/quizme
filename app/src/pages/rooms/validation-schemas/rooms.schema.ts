import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const createRoomSchema = z.object({
    project_id: z.string().min(1, { error: () => tr("rooms:create.validation.project") }),
    name: z.string().trim().min(1, { error: () => tr("rooms:create.validation.name") }).max(80, { error: () => tr("common:validation.maxLength", { count: 80 }) }),
});
export type CreateRoomFormValues = z.infer<typeof createRoomSchema>;
