import { ReviewRatings, type ReviewRating } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { tr } from "@/lib/i18n-options";

const rating = (id: ReviewRating, key: string) => ({
    id,
    key,
    get label(): string {
        return tr(`flashcards:rating.${id}.label`);
    },
    get description(): string {
        return tr(`flashcards:rating.${id}.description`);
    },
});

export const ReviewRatingOptions: { id: ReviewRating; label: string; key: string; description: string }[] = [
    rating(ReviewRatings.AGAIN, "1"),
    rating(ReviewRatings.HARD, "2"),
    rating(ReviewRatings.GOOD, "3"),
    rating(ReviewRatings.EASY, "4"),
];

export const getReviewRatingLabel = (r: ReviewRating | string): string => ReviewRatingOptions.find((o) => o.id === r)?.label ?? r;
