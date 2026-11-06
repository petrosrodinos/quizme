import { ReviewRatings, type ReviewRating } from "@/features/flashcards/interfaces/flashcards.interfaces";

export const ReviewRatingOptions: { id: ReviewRating; label: string; key: string; description: string }[] = [
    { id: ReviewRatings.AGAIN, label: "Again", key: "1", description: "Forgot it — show again soon" },
    { id: ReviewRatings.HARD, label: "Hard", key: "2", description: "Recalled with serious effort" },
    { id: ReviewRatings.GOOD, label: "Good", key: "3", description: "Recalled after a moment" },
    { id: ReviewRatings.EASY, label: "Easy", key: "4", description: "Instant recall" },
];

export const getReviewRatingLabel = (rating: ReviewRating | string): string => ReviewRatingOptions.find((o) => o.id === rating)?.label ?? rating;
