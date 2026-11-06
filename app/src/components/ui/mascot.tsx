import { cn } from "@/lib/utils";

export const MascotPoses = {
    WAVE: "wave",
    CELEBRATE: "celebrate",
    THINK: "think",
    SAD: "sad",
    READ: "read",
    SLEEP: "sleep",
    TROPHY: "trophy",
    FIRE: "fire",
} as const;
export type MascotPose = (typeof MascotPoses)[keyof typeof MascotPoses];

export const Illustrations = {
    CHEST: "chest",
    GEM: "gem",
    FLAME: "flame",
    BOOKS: "books",
} as const;
export type Illustration = (typeof Illustrations)[keyof typeof Illustrations];

interface MascotProps {
    pose?: MascotPose;
    className?: string;
    /** Gentle idle float animation. */
    animated?: boolean;
    alt?: string;
}

/** "Qubi", the QuizMe mascot (generated artwork in /public/mascot). Decorative by default. */
export const Mascot = ({ pose = MascotPoses.WAVE, className, animated, alt = "" }: MascotProps) => (
    <img
        src={`/mascot/mascot-${pose}.webp`}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        draggable={false}
        loading="lazy"
        className={cn("pointer-events-none select-none object-contain", animated && "pf-float", className)}
    />
);

/** Small 3D-style illustration (chest, gem, flame, books). */
export const Illo = ({ name, className, alt = "" }: { name: Illustration; className?: string; alt?: string }) => (
    <img
        src={`/mascot/${name}.webp`}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        draggable={false}
        loading="lazy"
        className={cn("pointer-events-none select-none object-contain", className)}
    />
);
