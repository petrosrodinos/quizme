import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LearnStore {
    /** Project shown on the playful "Learn" path (the user's current course). */
    courseId: string | null;
    setCourseId: (id: string | null) => void;
}

export const useLearnStore = create<LearnStore>()(
    persist((set) => ({ courseId: null, setCourseId: (courseId) => set({ courseId }) }), { name: "learn" }),
);
