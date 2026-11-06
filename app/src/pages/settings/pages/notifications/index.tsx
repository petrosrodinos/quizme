import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { EmailNotificationOption, NotificationPrefOptions } from "@/config/constants/dropdowns/notifications/notification-pref.options";
import { usePreferences, useUpdatePreferences } from "@/features/preferences/hooks/use-preferences";
import type { NotificationPrefs } from "@/features/preferences/interfaces/preferences.interfaces";
import { SettingsSection, ToggleRow } from "../../components/settings-section";

export default function SettingsNotificationsPage() {
    usePageMetadata({ title: "Notification settings" });
    const { data, isPending } = usePreferences();
    const update = useUpdatePreferences({ silent: true });
    const prefs: NotificationPrefs = data?.notification_prefs ?? {};
    const set = (key: keyof NotificationPrefs, value: boolean) => update.mutate({ notification_prefs: { ...prefs, [key]: value } });

    if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

    return (
        <div className="space-y-6">
            <SettingsSection title="In-app notifications" description="Choose what QuizMe tells you about. Reminders respect your timezone and are sent at most once a day.">
                <div className="divide-y divide-border">
                    {NotificationPrefOptions.map((o) => (
                        <ToggleRow
                            key={o.id}
                            id={`notif-${o.id}`}
                            label={o.label}
                            description={o.description}
                            control={<Switch id={`notif-${o.id}`} aria-describedby={`notif-${o.id}-desc`} checked={prefs[o.id] !== false} onCheckedChange={(c) => set(o.id, c)} />}
                        />
                    ))}
                </div>
            </SettingsSection>
            <SettingsSection title="Email">
                <ToggleRow
                    id="notif-email"
                    label={EmailNotificationOption.label}
                    description={EmailNotificationOption.description}
                    control={<Switch id="notif-email" aria-describedby="notif-email-desc" checked={prefs.email === true} onCheckedChange={(c) => set("email", c)} />}
                />
            </SettingsSection>
        </div>
    );
}
