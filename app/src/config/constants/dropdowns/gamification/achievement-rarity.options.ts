import { tOption } from "@/lib/i18n-options";
import { AchievementRarities, type AchievementRarity } from "@/features/gamification/interfaces/gamification.interfaces";

export const AchievementRarityOptions: { id: AchievementRarity; label: string }[] = [
    tOption(AchievementRarities.COMMON, "gamification:rarity.COMMON"),
    tOption(AchievementRarities.UNCOMMON, "gamification:rarity.UNCOMMON"),
    tOption(AchievementRarities.RARE, "gamification:rarity.RARE"),
    tOption(AchievementRarities.EPIC, "gamification:rarity.EPIC"),
    tOption(AchievementRarities.LEGENDARY, "gamification:rarity.LEGENDARY"),
];

export const getAchievementRarityLabel = (rarity: string) => AchievementRarityOptions.find((o) => o.id === rarity)?.label ?? rarity;
