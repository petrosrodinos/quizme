import { tr } from "@/lib/i18n-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
    assignItems,
    createLesson,
    createUnit,
    deleteLesson,
    deleteUnit,
    getCurriculum,
    getLesson,
    reorderCurriculum,
    unassignItems,
    updateLesson,
    updateUnit,
} from "../services/curriculum.services";
import type { Curriculum, CurriculumFormDto, LessonItemType, ReorderPayload } from "../interfaces/curriculum.interfaces";

export const useCurriculum = (projectId: string) =>
    useQuery({ queryKey: ["curriculum", projectId], queryFn: () => getCurriculum(projectId), enabled: !!projectId });

export const useLesson = (id: string | undefined) =>
    useQuery({ queryKey: ["curriculum", "lesson", id], queryFn: () => getLesson(id as string), enabled: !!id });

/** Any structure/assignment change can alter counts, lesson contents and lesson-filtered lists. */
const useInvalidate = () => {
    const queryClient = useQueryClient();
    return () => {
        ["curriculum", "documents", "quizzes", "decks"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    };
};

const onError = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

export const useCreateUnit = (projectId: string) => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: (dto: CurriculumFormDto) => createUnit(projectId, dto),
        onSuccess: () => {
            invalidate();
            toast({ title: tr("curriculum:toasts.unitAdded"), duration: 2000 });
        },
        onError: onError(tr("curriculum:toasts.unitAddFailed")),
    });
};

export const useUpdateUnit = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<CurriculumFormDto> }) => updateUnit(id, dto),
        onSuccess: invalidate,
        onError: onError(tr("curriculum:toasts.updateFailed")),
    });
};

export const useDeleteUnit = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: (id: string) => deleteUnit(id),
        onSuccess: () => {
            invalidate();
            toast({ title: tr("curriculum:toasts.unitDeleted"), duration: 2000 });
        },
        onError: onError(tr("curriculum:toasts.deleteFailed")),
    });
};

export const useCreateLesson = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ unitId, dto }: { unitId: string; dto: CurriculumFormDto }) => createLesson(unitId, dto),
        onSuccess: () => {
            invalidate();
            toast({ title: tr("curriculum:toasts.lessonAdded"), duration: 2000 });
        },
        onError: onError(tr("curriculum:toasts.lessonAddFailed")),
    });
};

export const useUpdateLesson = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<CurriculumFormDto> }) => updateLesson(id, dto),
        onSuccess: invalidate,
        onError: onError(tr("curriculum:toasts.updateFailed")),
    });
};

export const useDeleteLesson = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: (id: string) => deleteLesson(id),
        onSuccess: () => {
            invalidate();
            toast({ title: tr("curriculum:toasts.lessonDeleted"), duration: 2000 });
        },
        onError: onError(tr("curriculum:toasts.deleteFailed")),
    });
};

/** Reorders optimistically (drag-and-drop must not snap back while the request is in flight) and rolls back on failure. */
export const useReorderCurriculum = (projectId: string) => {
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    const key = ["curriculum", projectId];
    return useMutation({
        mutationFn: (payload: ReorderPayload) => reorderCurriculum(projectId, payload),
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<Curriculum>(key);
            if (previous) {
                const lessons = new Map(previous.units.flatMap((u) => u.lessons).map((l) => [l.id, l]));
                const units = new Map(previous.units.map((u) => [u.id, u]));
                queryClient.setQueryData<Curriculum>(key, {
                    ...previous,
                    units: payload.units.flatMap((pu, ui) => {
                        const unit = units.get(pu.id);
                        if (!unit) return [];
                        return [
                            {
                                ...unit,
                                order_index: ui,
                                lessons: pu.lesson_ids.flatMap((lid, li) => {
                                    const lesson = lessons.get(lid);
                                    return lesson ? [{ ...lesson, unit_id: unit.id, order_index: li }] : [];
                                }),
                            },
                        ];
                    }),
                });
            }
            return { previous };
        },
        onError: (error: Error, _vars, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
            toast({ title: tr("curriculum:toasts.reorderFailed"), description: error.message, variant: "error" });
        },
        onSettled: invalidate,
    });
};

export const useAssignItems = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ lessonId, type, ids }: { lessonId: string; type: LessonItemType; ids: string[] }) => assignItems(lessonId, type, ids),
        onSuccess: invalidate,
        onError: onError(tr("curriculum:toasts.assignFailed")),
    });
};

export const useUnassignItems = (projectId: string) => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ type, ids }: { type: LessonItemType; ids: string[] }) => unassignItems(projectId, type, ids),
        onSuccess: invalidate,
        onError: onError(tr("curriculum:toasts.assignFailed")),
    });
};
