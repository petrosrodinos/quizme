import type { SharePermission, ShareResourceType, ShareTargetType } from "@/features/shares/interfaces/shares.interfaces";
import { tOption } from "@/lib/i18n-options";

type DescribedOption<T> = { id: T; label: string; description: string };

export const ShareResourceTypeFormOptions: DescribedOption<ShareResourceType>[] = (
    ["PROJECT", "DOCUMENT", "DECK", "QUIZ", "NOTE", "STUDY_PLAN"] as ShareResourceType[]
).map((id) => tOption(id, `members:share.resourceTypes.${id}.label`, `members:share.resourceTypes.${id}.description`) as DescribedOption<ShareResourceType>);

export const getShareResourceTypeLabel = (id: string): string => ShareResourceTypeFormOptions.find((o) => o.id === id)?.label ?? id;

export const ShareTargetTypeFormOptions: DescribedOption<ShareTargetType>[] = (["USER", "LINK", "ORGANIZATION"] as ShareTargetType[]).map(
    (id) => tOption(id, `members:share.targetTypes.${id}.label`, `members:share.targetTypes.${id}.description`) as DescribedOption<ShareTargetType>,
);

export const getShareTargetTypeLabel = (id: string): string => ShareTargetTypeFormOptions.find((o) => o.id === id)?.label ?? id;

export const SharePermissionFormOptions: { id: SharePermission; label: string }[] = (["VIEW", "EDIT"] as SharePermission[]).map((id) =>
    tOption(id, `members:share.permissions.${id}`),
);

export const getSharePermissionLabel = (id: string): string => SharePermissionFormOptions.find((o) => o.id === id)?.label ?? id;
