import type { CSSProperties, ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SortableListProps<T extends { id: string }> {
    items: T[];
    disabled?: boolean;
    /** Receives the new order of ids after a drop that changed the position. */
    onReorder: (ordered: T[]) => void;
    children: ReactNode;
}

/** Vertical drag-and-drop list (pointer + keyboard). Rows inside must be `SortableRow`s keyed by the same ids. */
export function SortableList<T extends { id: string }>({ items, disabled, onReorder, children }: SortableListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = items.findIndex((i) => i.id === active.id);
        const to = items.findIndex((i) => i.id === over.id);
        if (from < 0 || to < 0) return;
        onReorder(arrayMove(items, from, to));
    };
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy} disabled={disabled}>
                {children}
            </SortableContext>
        </DndContext>
    );
}

interface SortableRowProps {
    id: string;
    disabled?: boolean;
    as?: "div" | "section";
    className?: string;
    /** Render with the drag handle to place wherever it fits the row. */
    children: (handle: ReactNode) => ReactNode;
}

export const SortableRow = ({ id, disabled, as: Tag = "div", className, children }: SortableRowProps) => {
    const { t } = useTranslation("curriculum");
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
    const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
    const handle = disabled ? null : (
        <button
            type="button"
            ref={setActivatorNodeRef}
            className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
            aria-label={t("dnd.handle")}
            {...attributes}
            {...listeners}
        >
            <GripVertical className="h-4 w-4" />
        </button>
    );
    return (
        <Tag ref={setNodeRef as never} style={style} className={cn(className, isDragging && "relative z-10 opacity-80 shadow-lg")}>
            {children(handle)}
        </Tag>
    );
};
