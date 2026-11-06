export const ReviewRatingLabelOptions: { id: "AGAIN" | "HARD" | "GOOD" | "EASY"; label: string }[] = [
    { id: "AGAIN", label: "Again" },
    { id: "HARD", label: "Hard" },
    { id: "GOOD", label: "Good" },
    { id: "EASY", label: "Easy" },
];

export const getReviewRatingLabel = (rating: string) => ReviewRatingLabelOptions.find((o) => o.id === rating)?.label ?? rating;

export const ReadinessConfidenceOptions: { id: "low" | "medium" | "high"; label: string }[] = [
    { id: "low", label: "Low confidence — answer more questions" },
    { id: "medium", label: "Medium confidence" },
    { id: "high", label: "High confidence" },
];

export const getReadinessConfidenceLabel = (c: string) => ReadinessConfidenceOptions.find((o) => o.id === c)?.label ?? c;
