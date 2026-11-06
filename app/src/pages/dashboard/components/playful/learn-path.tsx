import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpenText, Check, Lock, Star, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Illo, Mascot, type MascotPose } from "@/components/ui/mascot";
import { useStartSessionQuiz } from "@/features/study/hooks/use-study";
import { QuizModes } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { TopicNode } from "@/features/topics/interfaces/topics.interfaces";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";

/** A lesson is "done" once its topic is mastered (or ≥ 80% mastery). */
const DONE_MASTERY = 80;
const LESSON_XP = 10;
const REVIEW_XP = 20;
const LESSONS_PER_CHEST = 3;
/** Horizontal zig-zag (px) of consecutive nodes, Duolingo-style. */
const OFFSETS = [0, 48, 76, 48, 0, -48, -76, -48];
const UNIT_COLORS = [
    { fill: "var(--pf-green)", ridge: "var(--pf-green-ridge)" },
    { fill: "var(--pf-purple)", ridge: "var(--pf-purple-ridge)" },
    { fill: "var(--pf-blue)", ridge: "var(--pf-blue-ridge)" },
    { fill: "var(--pf-orange)", ridge: "var(--pf-orange-ridge)" },
];
const MASCOT_POSES: MascotPose[] = ["read", "think", "celebrate", "fire"];

type NodeState = "done" | "current" | "locked";

interface Lesson {
    topic: TopicNode;
    state: NodeState;
    /** 1-based level of this topic (topics are split into levels when a unit has few topics). */
    level: number;
    levels: number;
}

interface Unit {
    topic: TopicNode;
    lessons: Lesson[];
}

const descendantsOrSelf = (t: TopicNode): TopicNode[] => {
    const out: TopicNode[] = [];
    const walk = (n: TopicNode) => {
        if (!n.children.length) out.push(n);
        n.children.forEach(walk);
    };
    walk(t);
    return out.length ? out : [t];
};

/** Units aim for at least this many lesson nodes; small units split each topic into mastery levels. */
const MIN_LESSONS_PER_UNIT = 4;
const MAX_LEVELS = 3;

/** Level `level` of `levels` is done once mastery reaches its share of DONE_MASTERY (or the topic is mastered). */
const isLevelDone = (t: TopicNode, level: number, levels: number) => t.mastered || t.mastery >= (DONE_MASTERY * level) / levels;

/** Builds units (top-level topics) → lessons (leaf topics × levels), marking done / current / locked in path order. */
const buildUnits = (tree: TopicNode[]): Unit[] => {
    let currentFound = false;
    return tree.map((topic) => {
        const leaves = descendantsOrSelf(topic);
        const levels = Math.min(MAX_LEVELS, Math.max(1, Math.ceil(MIN_LESSONS_PER_UNIT / leaves.length)));
        const lessons: Lesson[] = [];
        for (const leaf of leaves) {
            for (let level = 1; level <= levels; level++) {
                let state: NodeState = "locked";
                if (isLevelDone(leaf, level, levels)) state = "done";
                else if (!currentFound) {
                    currentFound = true;
                    state = "current";
                }
                lessons.push({ topic: leaf, state, level, levels });
            }
        }
        return { topic, lessons };
    });
};

interface LearnPathProps {
    projectId: string;
    tree: TopicNode[];
    cardsDue: number;
}

/** The winding lesson path for one course. */
export const LearnPath = ({ projectId, tree, cardsDue }: LearnPathProps) => {
    const units = useMemo(() => buildUnits(tree), [tree]);
    return (
        <div className="space-y-10">
            {units.map((unit, i) => (
                <UnitSection key={unit.topic.id} unit={unit} index={i} projectId={projectId} cardsDue={cardsDue} />
            ))}
        </div>
    );
};

const UnitSection = ({ unit, index, projectId, cardsDue }: { unit: Unit; index: number; projectId: string; cardsDue: number }) => {
    const { t } = useTranslation("playful");
    const color = UNIT_COLORS[index % UNIT_COLORS.length];

    // Path items: lessons with a chest after every few lessons, then the unit review trophy.
    const items = useMemo(() => {
        const out: ({ kind: "lesson"; lesson: Lesson; n: number } | { kind: "chest"; locked: boolean } | { kind: "trophy"; locked: boolean })[] = [];
        unit.lessons.forEach((lesson, i) => {
            out.push({ kind: "lesson", lesson, n: i + 1 });
            const lastInUnit = i === unit.lessons.length - 1;
            if ((i + 1) % LESSONS_PER_CHEST === 0 && !lastInUnit) out.push({ kind: "chest", locked: lesson.state === "locked" });
        });
        out.push({ kind: "trophy", locked: unit.lessons.some((l) => l.state === "locked") });
        return out;
    }, [unit.lessons]);

    // Sit the mascot beside a node that leans the other way, so it never overflows a phone screen.
    const mascotRight = index % 2 === 1 && items.length > 5;
    const mascotAt = mascotRight ? 5 : Math.min(1, items.length - 1);

    return (
        <section aria-labelledby={`unit-${unit.topic.id}`}>
            <header
                className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-20 mb-8 flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-white sm:px-5 xl:top-4"
                style={{ background: color.fill, boxShadow: `0 4px 0 0 ${color.ridge}` }}
            >
                <div className="min-w-0">
                    <div className="text-[13px] font-extrabold uppercase tracking-wide opacity-85">{t("home.unit", { n: index + 1 })}</div>
                    <h2 id={`unit-${unit.topic.id}`} className="truncate text-lg font-extrabold sm:text-xl">
                        {unit.topic.name}
                    </h2>
                </div>
                <Link
                    to={Routes.projects.topics(projectId)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-white/40 px-3 py-2 text-[13px] font-extrabold uppercase tracking-wide hover:bg-white/10"
                    style={{ boxShadow: `0 3px 0 0 ${color.ridge}` }}
                >
                    <BookOpenText className="size-5" />
                    <span className="hidden sm:inline">{t("home.guidebook")}</span>
                </Link>
            </header>

            <ol className="relative flex flex-col items-center gap-9 pb-4 pt-8">
                {items.map((item, i) => (
                    <Fragment key={i}>
                        <li className="relative" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
                            {item.kind === "lesson" && <LessonNode projectId={projectId} lesson={item.lesson} n={item.n} total={unit.lessons.length} color={color} />}
                            {item.kind === "chest" && <ChestNode projectId={projectId} locked={item.locked} cardsDue={cardsDue} />}
                            {item.kind === "trophy" && <TrophyNode projectId={projectId} unit={unit} locked={item.locked} color={color} />}
                            {i === mascotAt && (
                                <Mascot
                                    pose={MASCOT_POSES[index % MASCOT_POSES.length]}
                                    animated
                                    className={cn("absolute top-1/2 size-24 -translate-y-1/2 sm:size-36", mascotRight ? "left-[120%] sm:left-[170%]" : "right-[120%] sm:right-[170%]")}
                                />
                            )}
                        </li>
                    </Fragment>
                ))}
            </ol>
        </section>
    );
};

const useStartLesson = (projectId: string) => {
    const navigate = useNavigate();
    const start = useStartSessionQuiz();
    return {
        pending: start.isPending,
        run: (title: string, topicIds: string[], count: number) =>
            start.mutate(
                { projectId, dto: { title, mode: QuizModes.PRACTICE, count, topic_ids: topicIds, use_bank: true } },
                { onSuccess: (quiz) => navigate(Routes.projects.quiz_take(projectId, quiz.id)) },
            ),
    };
};

const popoverCard = "w-72 rounded-2xl border-0 p-4 text-white";

const LessonNode = ({ projectId, lesson, n, total, color }: { projectId: string; lesson: Lesson; n: number; total: number; color: { fill: string; ridge: string } }) => {
    const { t } = useTranslation("playful");
    const [open, setOpen] = useState(false);
    const start = useStartLesson(projectId);
    const { topic, state } = lesson;
    const locked = state === "locked";
    const Icon = state === "done" ? Check : locked ? Lock : Star;
    const mastery = Math.round(topic.mastery);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="relative grid place-items-center">
                {state === "current" && (
                    <>
                        <span className="pf-node-ring" style={{ ["--p" as string]: mastery }} aria-hidden>
                            <span />
                        </span>
                        <span className="pf-bounce absolute -top-12 z-10 whitespace-nowrap rounded-xl border-2 border-border bg-background px-3 py-1.5 text-[15px] font-extrabold uppercase tracking-wide" style={{ color: color.fill }}>
                            {t("home.start")}
                            <span className="absolute -bottom-[9px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-border bg-background" aria-hidden />
                        </span>
                    </>
                )}
                <PopoverTrigger
                    className="pf-node focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
                    data-locked={locked}
                    data-state={state}
                    style={state === "current" ? ({ "--node": color.fill, "--node-ridge": color.ridge } as React.CSSProperties) : undefined}
                    aria-label={`${topic.name} — ${t("home.lessonOf", { n, total })}`}
                >
                    <Icon className="size-8" strokeWidth={3.2} fill={state === "current" ? "currentColor" : "none"} />
                </PopoverTrigger>
            </div>
            <PopoverContent
                side="bottom"
                sideOffset={14}
                className={popoverCard}
                style={{ background: locked ? "var(--muted)" : state === "done" ? "var(--pf-yellow)" : color.fill, color: locked ? "var(--muted-foreground)" : "#fff" }}
            >
                <div className="text-lg font-extrabold leading-tight">{topic.name}</div>
                <div className="mt-1 text-sm font-bold opacity-90">
                    {locked ? t("home.jumpHere") : t("home.lessonOf", { n, total })}
                    {lesson.levels > 1 && ` · ${t("home.level", { level: lesson.level, levels: lesson.levels })}`} · {t("home.mastery", { value: mastery })}
                </div>
                <Button
                    className="pf-btn-white mt-4 w-full"
                    style={locked ? undefined : { color: state === "done" ? "var(--pf-yellow-ridge)" : color.fill }}
                    loading={start.pending}
                    onClick={() => start.run(topic.name, [topic.id], 5)}
                >
                    {state === "done" ? t("home.practiceAgain", { xp: LESSON_XP }) : t("home.startLesson", { xp: LESSON_XP })}
                </Button>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs font-extrabold uppercase tracking-wide">
                    <Link to={Routes.projects.flashcards(projectId)} className="rounded-lg py-2 hover:bg-black/10">
                        {t("home.flashcards")}
                    </Link>
                    <Link to={Routes.projects.tutor(projectId)} className="rounded-lg py-2 hover:bg-black/10">
                        {t("home.askTutor")}
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const ChestNode = ({ projectId, locked, cardsDue }: { projectId: string; locked: boolean; cardsDue: number }) => {
    const { t } = useTranslation("playful");
    return (
        <Popover>
            <PopoverTrigger className="grid size-20 place-items-center rounded-full transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-95" aria-label={t("home.chestTitle")}>
                <Illo name="chest" className={cn("size-20", locked && "opacity-50 grayscale")} />
            </PopoverTrigger>
            <PopoverContent side="bottom" sideOffset={10} className={popoverCard} style={{ background: "var(--pf-orange)" }}>
                <div className="text-lg font-extrabold">{t("home.chestTitle")}</div>
                <p className="mt-1 text-sm font-bold opacity-90">{cardsDue ? t("home.chestDue", { count: cardsDue }) : t("home.chestDescription")}</p>
                <Button asChild className="pf-btn-white mt-4 w-full" style={{ color: "var(--pf-orange)" }}>
                    <Link to={Routes.projects.flashcards_review(projectId)}>{t("home.openChest")}</Link>
                </Button>
            </PopoverContent>
        </Popover>
    );
};

const TrophyNode = ({ projectId, unit, locked, color }: { projectId: string; unit: Unit; locked: boolean; color: { fill: string; ridge: string } }) => {
    const { t } = useTranslation("playful");
    const start = useStartLesson(projectId);
    const done = unit.lessons.every((l) => l.state === "done");
    return (
        <Popover>
            <PopoverTrigger
                className="pf-node focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
                data-locked={locked}
                data-state={done ? "done" : "current"}
                style={!locked && !done ? ({ "--node": color.fill, "--node-ridge": color.ridge } as React.CSSProperties) : undefined}
                aria-label={t("home.unitReview")}
            >
                <Trophy className="size-8" strokeWidth={2.8} />
            </PopoverTrigger>
            <PopoverContent side="bottom" sideOffset={14} className={popoverCard} style={{ background: locked ? "var(--muted)" : color.fill, color: locked ? "var(--muted-foreground)" : "#fff" }}>
                <div className="text-lg font-extrabold">{t("home.unitReview")}</div>
                <p className="mt-1 text-sm font-bold opacity-90">{t("home.unitReviewDescription")}</p>
                <Button
                    className="pf-btn-white mt-4 w-full"
                    style={locked ? undefined : { color: color.fill }}
                    loading={start.pending}
                    onClick={() => start.run(`${t("home.unitReview")}: ${unit.topic.name}`, [...new Set(unit.lessons.map((l) => l.topic.id))], 10)}
                >
                    {t("home.startReview", { xp: REVIEW_XP })}
                </Button>
            </PopoverContent>
        </Popover>
    );
};
