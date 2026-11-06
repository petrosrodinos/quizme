import { useState } from "react";
import { LogOut, Monitor, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDateTime, formatRelative } from "@/lib/date";
import { useRevokeOtherSessions, useRevokeSession, useSessions } from "@/features/auth/hooks/use-auth";
import type { ActiveSession } from "@/features/auth/interfaces/auth.interface";
import { SettingsSection } from "../../components/settings-section";
import { describeUserAgent } from "../../utils/user-agent.utils";

export default function SettingsSessionsPage() {
    const { t } = useTranslation("settings");
    usePageMetadata({ title: t("tabs.sessions") });
    const { data, isPending } = useSessions();
    const revoke = useRevokeSession();
    const revokeOthers = useRevokeOtherSessions();
    const [target, setTarget] = useState<ActiveSession | null>(null);
    const [othersOpen, setOthersOpen] = useState(false);
    const others = (data ?? []).filter((s) => !s.current).length;

    return (
        <div className="space-y-6">
            <SettingsSection
                title={t("sessions.title")}
                description={t("sessions.description")}
            >
                {isPending ? (
                    <ListSkeleton rows={3} />
                ) : (
                    <>
                        <ul className="divide-y divide-border">
                            {(data ?? []).map((s) => {
                                const d = describeUserAgent(s.user_agent);
                                const Icon = d.mobile ? Smartphone : Monitor;
                                return (
                                    <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-muted-foreground">
                                            <Icon className="h-4 w-4" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                                {t("sessions.device", { browser: d.browser, os: d.os })}
                                                {s.current && <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] text-success">{t("sessions.current")}</span>}
                                            </div>
                                            <div className="text-xs text-muted-foreground" title={t("sessions.signedIn", { date: formatDateTime(s.created_at) })}>
                                                {s.ip_address ? `${s.ip_address} · ` : ""}{t("sessions.active", { time: formatRelative(s.last_used_at) })}
                                            </div>
                                        </div>
                                        {!s.current && (
                                            <Button size="sm" variant="outline" onClick={() => setTarget(s)}>
                                                {t("sessions.revoke")}
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        {others > 0 && (
                            <Button className="mt-4 h-auto min-h-9 max-w-full whitespace-normal py-2 text-left" variant="outline" onClick={() => setOthersOpen(true)}>
                                <LogOut /> {t("sessions.revokeOthers")}
                            </Button>
                        )}
                    </>
                )}
            </SettingsSection>

            <ConfirmationDialog
                isOpen={!!target}
                onClose={() => setTarget(null)}
                onConfirm={() => target && revoke.mutate(target.id, { onSuccess: () => setTarget(null) })}
                title={t("sessions.revokeDialog.title")}
                description={t("sessions.revokeDialog.description")}
                confirmText={t("sessions.revoke")}
                variant="destructive"
                isLoading={revoke.isPending}
            />
            <ConfirmationDialog
                isOpen={othersOpen}
                onClose={() => setOthersOpen(false)}
                onConfirm={() => revokeOthers.mutate(undefined, { onSuccess: () => setOthersOpen(false) })}
                title={t("sessions.othersDialog.title")}
                description={t("sessions.othersDialog.description", { count: others })}
                confirmText={t("sessions.othersDialog.confirm")}
                variant="destructive"
                isLoading={revokeOthers.isPending}
            />
        </div>
    );
}
