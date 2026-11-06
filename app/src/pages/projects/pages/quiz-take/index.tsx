import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { useAttempt, useCompleteAttempt, useQuiz, useStartAttempt } from "@/features/quizzes/hooks/use-quizzes";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { GenerationStatuses, QuizModes, type GenerationStatusEvent } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { GenerationWaiting } from "@/pages/projects/components/quiz/generation-waiting";
import { PracticePlayer } from "./components/practice-player";
import { ExamPlayer } from "./components/exam-player";

export default function QuizTakePage() {
    const { projectId } = useProjectContext();
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const quizQuery = useQuiz(quizId, { pollWhileGenerating: true });
    const start = useStartAttempt();
    const complete = useCompleteAttempt();
    const startedRef = useRef(false);
    const [attemptId, setAttemptId] = useState<string | undefined>();
    const attemptQuery = useAttempt(attemptId);
    const quiz = quizQuery.data;
    usePageMetadata({ title: quiz?.title ?? "Quiz" });

    useRealtimeEvent<GenerationStatusEvent>(RealtimeEvents.GENERATION_STATUS, (e) => {
        if (e.id === quizId) queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    });

    useEffect(() => {
        if (quiz?.status === GenerationStatuses.READY && quizId && !startedRef.current) {
            startedRef.current = true;
            start.mutate(quizId, { onSuccess: (d) => setAttemptId(d.attempt.id) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quiz?.status, quizId]);

    const detail = attemptQuery.data;

    useEffect(() => {
        if (detail?.attempt.status === "COMPLETED") navigate(Routes.projects.attempt(projectId, detail.attempt.id), { replace: true });
    }, [detail?.attempt.status, detail?.attempt.id, navigate, projectId]);

    const backToQuizzes = useCallback(() => navigate(Routes.projects.quizzes(projectId)), [navigate, projectId]);

    const finish = useCallback(() => {
        if (!detail || complete.isPending) return;
        complete.mutate(detail.attempt.id, {
            onSuccess: (summary) => navigate(Routes.projects.attempt(projectId, summary.attempt.id), { replace: true }),
        });
    }, [detail, complete, navigate, projectId]);

    if (quizQuery.isError) {
        return (
            <Main>
                <EmptyState title="Quiz not found" description={quizQuery.error.message} action={<Button onClick={backToQuizzes}>Back to quizzes</Button>} />
            </Main>
        );
    }
    if (quiz && quiz.status !== GenerationStatuses.READY) {
        return (
            <Main width="narrow">
                <GenerationWaiting quiz={quiz} onBack={backToQuizzes} />
            </Main>
        );
    }
    if (start.isError) {
        return (
            <Main>
                <EmptyState title="Could not start this quiz" description={start.error.message} action={<Button onClick={backToQuizzes}>Back to quizzes</Button>} />
            </Main>
        );
    }
    if (!detail || !quiz) {
        return (
            <Main width="narrow">
                <DetailSkeleton />
            </Main>
        );
    }
    if (!detail.questions.length) {
        return (
            <Main>
                <EmptyState title="This quiz has no questions" action={<Button onClick={backToQuizzes}>Back to quizzes</Button>} />
            </Main>
        );
    }

    return (
        <Main width={detail.quiz.mode === QuizModes.EXAM ? "wide" : "default"}>
            {detail.quiz.mode === QuizModes.EXAM ? (
                <ExamPlayer detail={detail} onFinish={finish} finishing={complete.isPending} />
            ) : (
                <PracticePlayer projectId={projectId} detail={detail} onFinish={finish} onExit={backToQuizzes} finishing={complete.isPending} />
            )}
        </Main>
    );
}
