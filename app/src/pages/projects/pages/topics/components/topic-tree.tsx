import { useState } from "react";
import { ChevronRight, MoreHorizontal, Pencil, Play, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TopicNode } from "@/features/topics/interfaces/topics.interfaces";
import { getMasteryLevel, type MasteryLevel } from "@/config/constants/dropdowns/quizzes/mastery-level.options";

const LEVEL_BAR: Record<MasteryLevel, string> = {
    MASTERED: "bg-success",
    STRONG: "bg-teal",
    DEVELOPING: "bg-amber",
    WEAK: "bg-destructive",
    UNPRACTISED: "bg-muted-foreground/30",
};

const masteryColor = (m: number, attempts: number) => LEVEL_BAR[getMasteryLevel(m, attempts)];

export interface TopicActions {
    onPractice: (t: TopicNode) => void;
    onReview: (t: TopicNode) => void;
    onAddChild?: (t: TopicNode) => void;
    onRename?: (t: TopicNode) => void;
    onDelete?: (t: TopicNode) => void;
}

interface TopicTreeProps extends TopicActions {
    nodes: TopicNode[];
    reduceMotion: boolean;
}

/** Indented hierarchy with connector lines and per-topic mastery bars. Mastered nodes glow. */
export const TopicTree = ({ nodes, reduceMotion, ...actions }: TopicTreeProps) => (
    <ul role="tree" aria-label="Knowledge map" className="space-y-1">
        {nodes.map((n) => (
            <TopicTreeItem key={n.id} node={n} depth={0} reduceMotion={reduceMotion} {...actions} />
        ))}
    </ul>
);

const TopicTreeItem = ({ node, depth, reduceMotion, ...actions }: TopicActions & { node: TopicNode; depth: number; reduceMotion: boolean }) => {
    const [open, setOpen] = useState(depth === 0);
    const hasChildren = node.children.length > 0;
    return (
        <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-level={depth + 1} className={cn(depth > 0 && "relative ml-5 border-l border-border pl-4")}>
            {depth > 0 && <span className="absolute left-0 top-6 h-px w-4 bg-border" aria-hidden />}
            <div
                className={cn(
                    "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-card",
                    node.mastered && "border-success/40 bg-success/5 animate-node-pulse",
                )}
            >
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    disabled={!hasChildren}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground disabled:opacity-0"
                    aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
                >
                    <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className={cn("truncate", depth === 0 ? "font-medium" : "text-sm")}>{node.name}</span>
                        {node.mastered && <Sparkles className="h-3.5 w-3.5 shrink-0 text-success" aria-label="Mastered" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {node.counts.questions} questions · {node.counts.flashcards} cards · {node.attempts ? `${node.attempts} answers` : "not practised"}
                    </div>
                </div>
                <div className="hidden w-40 items-center gap-2 sm:flex">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-card" role="progressbar" aria-valuenow={node.mastery} aria-valuemin={0} aria-valuemax={100} aria-label={`${node.name} mastery`}>
                        <motion.div
                            className={cn("h-full rounded-full", masteryColor(node.mastery, node.attempts))}
                            initial={{ width: reduceMotion ? `${node.mastery}%` : 0 }}
                            animate={{ width: `${node.attempts ? node.mastery : 0}%` }}
                            transition={{ duration: reduceMotion ? 0 : 0.7 }}
                        />
                    </div>
                    <span className="w-10 text-right text-sm tabular-nums">{node.attempts ? `${node.mastery}%` : "—"}</span>
                </div>
                <Button size="sm" variant="ghost" className="hidden md:inline-flex" onClick={() => actions.onPractice(node)}>
                    <Play /> Practice
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${node.name}`}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => actions.onPractice(node)}>
                            <Play /> Practice this topic
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => actions.onReview(node)}>
                            <RotateCcw /> Review mistakes in topic
                        </DropdownMenuItem>
                        {(actions.onAddChild || actions.onRename || actions.onDelete) && <DropdownMenuSeparator />}
                        {actions.onAddChild && depth === 0 && (
                            <DropdownMenuItem onClick={() => actions.onAddChild!(node)}>
                                <Plus /> Add subtopic
                            </DropdownMenuItem>
                        )}
                        {actions.onRename && (
                            <DropdownMenuItem onClick={() => actions.onRename!(node)}>
                                <Pencil /> Rename
                            </DropdownMenuItem>
                        )}
                        {actions.onDelete && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => actions.onDelete!(node)}>
                                <Trash2 /> Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {hasChildren && open && (
                <ul role="group" className="mt-1 space-y-1">
                    {node.children.map((c) => (
                        <TopicTreeItem key={c.id} node={c} depth={depth + 1} reduceMotion={reduceMotion} {...actions} />
                    ))}
                </ul>
            )}
        </li>
    );
};
