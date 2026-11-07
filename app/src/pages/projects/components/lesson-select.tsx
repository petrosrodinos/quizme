import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurriculum } from "@/features/curriculum/hooks/use-curriculum";

const NONE = "__none__";
const ALL = "__all__";

interface Props {
    projectId: string;
    /** Selected lesson id; undefined = no lesson (or "all" when `allowAll`). */
    value: string | undefined;
    onChange: (lessonId: string | undefined) => void;
    /** Filter mode: first option means "all lessons" and `none` filters to unsorted via the "none" id. */
    allowAll?: boolean;
    id?: string;
    className?: string;
}

/** Lesson picker grouped by unit. Renders nothing while the project has no units. */
export const LessonSelect = ({ projectId, value, onChange, allowAll, id, className }: Props) => {
    const { t } = useTranslation("curriculum");
    const { data } = useCurriculum(projectId);
    if (!data?.units.some((u) => u.lessons.length)) return null;
    return (
        <Select
            value={value ?? (allowAll ? ALL : NONE)}
            onValueChange={(v) => onChange(v === NONE || v === ALL ? undefined : v)}
        >
            <SelectTrigger id={id} className={className} aria-label={t("picker.label")}>
                <SelectValue placeholder={t("picker.placeholder")} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={allowAll ? ALL : NONE}>{allowAll ? t("picker.all") : t("picker.none")}</SelectItem>
                {data.units
                    .filter((u) => u.lessons.length)
                    .map((u) => (
                        <SelectGroup key={u.id}>
                            <SelectLabel>{u.title}</SelectLabel>
                            {u.lessons.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                    {l.title}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
            </SelectContent>
        </Select>
    );
};
