import { AchievementRarities, type AchievementRarity } from "@/features/gamification/interfaces/gamification.interfaces";

export const AchievementRarityOptions: { id: AchievementRarity; label: string }[] = [
    { id: AchievementRarities.COMMON, label: "Common" },
    { id: AchievementRarities.UNCOMMON, label: "Uncommon" },
    { id: AchievementRarities.RARE, label: "Rare" },
    { id: AchievementRarities.EPIC, label: "Epic" },
    { id: AchievementRarities.LEGENDARY, label: "Legendary" },
];

export const getAchievementRarityLabel = (rarity: string) => AchievementRarityOptions.find((o) => o.id === rarity)?.label ?? rarity;
