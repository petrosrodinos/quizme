import { tOption } from "@/lib/i18n-options";

export const ReviewRatingLabelOptions: { id: "AGAIN" | "HARD" | "GOOD" | "EASY"; label: string }[] = [
    tOption("AGAIN", "progress:ratings.AGAIN"),
    tOption("HARD", "progress:ratings.HARD"),
    tOption("GOOD", "progress:ratings.GOOD"),
    tOption("EASY", "progress:ratings.EASY"),
];

export const getReviewRatingLabel = (rating: string) => ReviewRatingLabelOptions.find((o) => o.id === rating)?.label ?? rating;

export const ReadinessConfidenceOptions: { id: "low" | "medium" | "high"; label: string }[] = [
    tOption("low", "progress:confidence.low"),
    tOption("medium", "progress:confidence.medium"),
    tOption("high", "progress:confidence.high"),
];

export const getReadinessConfidenceLabel = (c: string) => ReadinessConfidenceOptions.find((o) => o.id === c)?.label ?? c;
