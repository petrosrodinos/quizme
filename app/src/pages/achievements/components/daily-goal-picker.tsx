import { useEffect, useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DailyGoalFormOptions } from "@/config/constants/dropdowns/gamification/daily-goal-form.options";
import { useUpdateDailyGoal } from "@/features/gamification/hooks/use-gamification";
import { DailyGoalTypes, type DailyGoalProgress, type DailyGoalType } from "@/features/gamification/interfaces/gamification.interfaces";

export const DailyGoalPicker: FC<{ goal: DailyGoalProgress }> = ({ goal }) => {
    const { t } = useTranslation("achievements");
    const update = useUpdateDailyGoal();
    const [selected, setSelected] = useState<DailyGoalType>(goal.type as DailyGoalType);
    const [custom, setCustom] = useState(String(goal.minutes));
    useEffect(() => {
        setSelected(goal.type as DailyGoalType);
        setCustom(String(goal.minutes));
    }, [goal.type, goal.minutes]);

    const save = (type: DailyGoalType) => {
        setSelected(type);
        if (type !== DailyGoalTypes.CUSTOM) update.mutate({ type });
    };
    const customMinutes = Math.min(480, Math.max(5, Number(custom) || 0));

    return (
        <div className="space-y-3">
            <div role="radiogroup" aria-label={t("common:terms.dailyGoal")} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {DailyGoalFormOptions.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={selected === o.id}
                        onClick={() => save(o.id)}
                        disabled={update.isPending}
                        className={cn(
                            "rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected === o.id ? "border-primary bg-primary/8" : "border-border hover:border-primary/40",
                        )}
                    >
                        <div className="text-sm font-medium">{o.label}</div>
                        <div className="text-xs text-muted-foreground">{o.minutes ? t("common:units.min", { count: o.minutes }) : t("goal.yourChoice")}</div>
                    </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">{DailyGoalFormOptions.find((o) => o.id === selected)?.description}</p>
            {selected === DailyGoalTypes.CUSTOM && (
                <div className="flex items-end gap-2">
                    <div className="space-y-1">
                        <Label htmlFor="custom-goal">{t("goal.minutesPerDay")}</Label>
                        <Input id="custom-goal" type="number" min={5} max={480} value={custom} onChange={(e) => setCustom(e.target.value)} className="w-32" />
                    </div>
                    <Button onClick={() => update.mutate({ type: DailyGoalTypes.CUSTOM, minutes: customMinutes })} loading={update.isPending}>
                        {t("goal.save")}
                    </Button>
                </div>
            )}
        </div>
    );
};
