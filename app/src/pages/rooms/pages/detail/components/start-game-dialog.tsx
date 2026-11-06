import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameSpeedFormOptions } from "@/config/constants/dropdowns/rooms/timer-mode.options";
import { useCreateQuiz, useQuiz, useQuizzes } from "@/features/quizzes/hooks/use-quizzes";
import { GenerationStatuses } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { useCreateGame } from "@/features/games/hooks/use-games";
import type { GameState } from "@/features/games/interfaces/games.interfaces";

interface StartGameDialogProps {
    projectId: string;
    roomId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (game: GameState) => void;
}

const NEW_QUIZ = "__new__";

/** Pick a ready quiz (or generate a fresh one) and open a multiplayer lobby. */
export const StartGameDialog = ({ projectId, roomId, open, onOpenChange, onCreated }: StartGameDialogProps) => {
    const quizzes = useQuizzes(projectId);
    const createQuiz = useCreateQuiz(projectId, { silent: true });
    const createGame = useCreateGame();
    const [quizId, setQuizId] = useState<string>("");
    const [seconds, setSeconds] = useState("20");
    const [generatingId, setGeneratingId] = useState<string | undefined>();
    const generating = useQuiz(generatingId, { pollWhileGenerating: true });
    const ready = (quizzes.data ?? []).filter((q) => q.status === GenerationStatuses.READY && (q.question_count ?? 0) > 0);

    useEffect(() => {
        if (open) {
            setGeneratingId(undefined);
            setQuizId("");
        }
    }, [open]);

    const launch = (id: string) =>
        createGame.mutate(
            { projectId, dto: { quiz_id: id, room_id: roomId, seconds_per_question: Number(seconds) } },
            {
                onSuccess: (game) => {
                    onOpenChange(false);
                    onCreated(game);
                },
            },
        );

    // Once a freshly generated quiz becomes ready, open the lobby automatically.
    useEffect(() => {
        const q = generating.data;
        if (!generatingId || !q) return;
        if (q.status === GenerationStatuses.READY && !createGame.isPending) {
            setGeneratingId(undefined);
            launch(q.id);
        }
        if (q.status === GenerationStatuses.FAILED) setGeneratingId(undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generating.data, generatingId]);

    const submit = () => {
        if (quizId === NEW_QUIZ) {
            createQuiz.mutate(
                { mode: "PRACTICE", count: 10, types: ["MCQ", "TRUE_FALSE", "FILL_BLANK"], difficulty: "mixed", title: "Multiplayer quiz" },
                { onSuccess: (q) => setGeneratingId(q.id) },
            );
        } else if (quizId) launch(quizId);
    };

    const busy = createQuiz.isPending || createGame.isPending || !!generatingId;
    const failed = generating.data?.status === GenerationStatuses.FAILED;

    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">Multiplayer quiz</DialogTitle>
                    <DialogDescription>Everyone answers at the same time; faster correct answers earn more points.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label id="game-quiz-label">Quiz</Label>
                        <Select value={quizId || undefined} onValueChange={setQuizId} disabled={busy}>
                            <SelectTrigger aria-labelledby="game-quiz-label">
                                <SelectValue placeholder={quizzes.isPending ? "Loading quizzes…" : "Choose a quiz"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NEW_QUIZ}>✨ Generate a new 10-question quiz</SelectItem>
                                {ready.map((q) => (
                                    <SelectItem key={q.id} value={q.id}>
                                        {q.title} ({q.question_count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label id="game-speed-label">Time per question</Label>
                        <Select value={seconds} onValueChange={setSeconds} disabled={busy}>
                            <SelectTrigger aria-labelledby="game-speed-label">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {GameSpeedFormOptions.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {generatingId ? (
                        <p className="flex items-center gap-2 rounded-lg bg-surface-card p-3 text-sm" role="status">
                            <Sparkles className="h-4 w-4 animate-pulse text-primary" aria-hidden /> Generating questions from your material…
                        </p>
                    ) : null}
                    {failed ? <p className="text-sm text-destructive">{generating.data?.error_message ?? "Generation failed. Try another quiz."}</p> : null}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={!quizId} loading={busy}>
                        Open lobby
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
