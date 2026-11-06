import { useState } from "react";
import { LogOut, Monitor, Smartphone } from "lucide-react";
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
    usePageMetadata({ title: "Sessions & security" });
    const { data, isPending } = useSessions();
    const revoke = useRevokeSession();
    const revokeOthers = useRevokeOtherSessions();
    const [target, setTarget] = useState<ActiveSession | null>(null);
    const [othersOpen, setOthersOpen] = useState(false);
    const others = (data ?? []).filter((s) => !s.current).length;

    return (
        <div className="space-y-6">
            <SettingsSection
                title="Active sessions"
                description="Devices currently signed in to your account. Revoke any you don't recognise."
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
                                                {d.browser} on {d.os}
                                                {s.current && <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] text-success">This device</span>}
                                            </div>
                                            <div className="text-xs text-muted-foreground" title={`Signed in ${formatDateTime(s.created_at)}`}>
                                                {s.ip_address ? `${s.ip_address} · ` : ""}active {formatRelative(s.last_used_at)}
                                            </div>
                                        </div>
                                        {!s.current && (
                                            <Button size="sm" variant="outline" onClick={() => setTarget(s)}>
                                                Revoke
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        {others > 0 && (
                            <Button className="mt-4" variant="outline" onClick={() => setOthersOpen(true)}>
                                <LogOut /> Sign out all other sessions
                            </Button>
                        )}
                    </>
                )}
            </SettingsSection>

            <ConfirmationDialog
                isOpen={!!target}
                onClose={() => setTarget(null)}
                onConfirm={() => target && revoke.mutate(target.id, { onSuccess: () => setTarget(null) })}
                title="Revoke this session?"
                description="That device will be signed out immediately."
                confirmText="Revoke"
                variant="destructive"
                isLoading={revoke.isPending}
            />
            <ConfirmationDialog
                isOpen={othersOpen}
                onClose={() => setOthersOpen(false)}
                onConfirm={() => revokeOthers.mutate(undefined, { onSuccess: () => setOthersOpen(false) })}
                title="Sign out everywhere else?"
                description={`All ${others} other session(s) will be signed out. You'll stay signed in here.`}
                confirmText="Sign out others"
                variant="destructive"
                isLoading={revokeOthers.isPending}
            />
        </div>
    );
}
