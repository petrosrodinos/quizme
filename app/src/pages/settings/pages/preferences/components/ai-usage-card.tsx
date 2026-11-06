import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { getAiTaskLabel } from "@/config/constants/dropdowns/preferences/preference.options";
import { useAiStatus, useAiUsage } from "@/features/ai/hooks/use-ai";
import { SettingsSection } from "../../../components/settings-section";

/** AI provider status and the current user's 30-day token usage (cost transparency). */
export const AiUsageCard = () => {
    const { t } = useTranslation("settings");
    const status = useAiStatus();
    const usage = useAiUsage();
    const rows = [...(usage.data?.by_task ?? [])].sort((a, b) => b.tokens - a.tokens).slice(0, 8);
    return (
        <SettingsSection title={t("aiUsage.title")} description={t("aiUsage.description")}>
            {status.isPending || usage.isPending ? (
                <Skeleton className="h-24 w-full" />
            ) : (
                <div className="space-y-4">
                    {status.data && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                            <span className="font-medium">{status.data.llm_available ? t("aiUsage.provider", { provider: status.data.provider }) : t("aiUsage.notConfigured")}</span>
                            {status.data.llm_available && (
                                <span className="text-muted-foreground">
                                    · {status.data.fast_model} / {status.data.smart_model}
                                </span>
                            )}
                        </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                        {t("aiUsage.last24h", { tokens: formatNumber(usage.data?.last_24h_tokens ?? 0) })}
                    </div>
                    {rows.length > 0 && (
                        <table className="w-full text-sm">
                            <caption className="sr-only">{t("aiUsage.caption")}</caption>
                            <thead>
                                <tr className="text-left text-xs text-muted-foreground">
                                    <th className="pb-2 font-medium">{t("aiUsage.task")}</th>
                                    <th className="pb-2 text-right font-medium">{t("aiUsage.calls")}</th>
                                    <th className="pb-2 text-right font-medium">{t("aiUsage.tokens")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {rows.map((r) => (
                                    <tr key={r.task}>
                                        <td className="py-1.5">{getAiTaskLabel(r.task)}</td>
                                        <td className="py-1.5 text-right tabular-nums">{formatNumber(r.calls)}</td>
                                        <td className="py-1.5 text-right tabular-nums">{formatNumber(r.tokens)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </SettingsSection>
    );
};
