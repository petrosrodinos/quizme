import { matchPath } from "react-router-dom";
import {
  BarChart3,
  BookOpenText,
  Brain,
  CalendarCheck,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Route as RouteIcon,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Routes } from "@/routes/routes";

export interface ProjectSection {
  /** Key under `projects:sections.*`. */
  key: string;
  to: string;
  end?: boolean;
  icon: LucideIcon;
  /** Playful-mode accent color. */
  color: string;
}

export interface ProjectSectionGroup {
  /** Key under `projects:sections.groups.*` (the overview group reuses `sections.overview`). */
  key: string;
  icon: LucideIcon;
  color: string;
  items: ProjectSection[];
}

/**
 * Single source of truth for project navigation, used by BOTH the classic layout and the playful header.
 * Add new project pages here (and a `sections.<key>` label in every locale) so they show up in both modes.
 */
export const projectSectionGroups = (id: string): ProjectSectionGroup[] => [
  {
    key: "overview",
    icon: LayoutGrid,
    color: "var(--pf-green)",
    items: [
      {
        key: "overview",
        to: Routes.projects.detail(id),
        end: true,
        icon: LayoutGrid,
        color: "var(--pf-green)",
      },
    ],
  },
  {
    key: "learn",
    icon: BookOpenText,
    color: "var(--pf-blue)",
    items: [
      {
        key: "curriculum",
        to: Routes.projects.curriculum(id),
        icon: RouteIcon,
        color: "var(--pf-green)",
      },
      {
        key: "documents",
        to: Routes.projects.documents(id),
        icon: FileText,
        color: "var(--pf-blue)",
      },
      {
        key: "notes",
        to: Routes.projects.notes(id),
        icon: NotebookPen,
        color: "var(--pf-yellow-ridge)",
      },
      {
        key: "topics",
        to: Routes.projects.topics(id),
        icon: BookOpenText,
        color: "var(--pf-green)",
      },
      {
        key: "summaries",
        to: Routes.projects.summaries(id),
        icon: ScrollText,
        color: "var(--pf-purple)",
      },
      {
        key: "tutor",
        to: Routes.projects.tutor(id),
        icon: MessageCircle,
        color: "var(--pf-purple)",
      },
    ],
  },
  {
    key: "practice",
    icon: ListChecks,
    color: "var(--pf-orange)",
    items: [
      {
        key: "quizzes",
        to: Routes.projects.quizzes(id),
        icon: ListChecks,
        color: "var(--pf-blue)",
      },
      {
        key: "flashcards",
        to: Routes.projects.flashcards(id),
        icon: Layers,
        color: "var(--pf-orange)",
      },
      {
        key: "questions",
        to: Routes.projects.questions(id),
        icon: Sparkles,
        color: "var(--pf-orange)",
      },
      {
        key: "recall",
        to: Routes.projects.recall(id),
        icon: Brain,
        color: "var(--pf-red)",
      },
      {
        key: "exam",
        to: Routes.projects.exam(id),
        icon: GraduationCap,
        color: "var(--pf-red)",
      },
    ],
  },
  {
    key: "track",
    icon: BarChart3,
    color: "var(--pf-purple)",
    items: [
      {
        key: "progress",
        to: Routes.projects.progress(id),
        icon: BarChart3,
        color: "var(--pf-blue)",
      },
      {
        key: "plan",
        to: Routes.projects.plan(id),
        icon: CalendarCheck,
        color: "var(--pf-green)",
      },
    ],
  },
  {
    key: "manage",
    icon: Settings,
    color: "var(--muted-foreground)",
    items: [
      {
        key: "members",
        to: Routes.projects.members(id),
        icon: Users,
        color: "var(--pf-purple)",
      },
      {
        key: "settings",
        to: Routes.projects.settings(id),
        icon: Settings,
        color: "var(--muted-foreground)",
      },
    ],
  },
];

/** The group whose page the current path belongs to (nested routes like quizzes/:id/take match their section by prefix). */
export const findActiveGroup = (
  groups: ProjectSectionGroup[],
  pathname: string,
): ProjectSectionGroup =>
  groups.find((g) =>
    g.items.some(
      (i) =>
        !!matchPath({ path: i.to, end: !!i.end }, pathname) ||
        (!i.end && pathname.startsWith(`${i.to}/`)),
    ),
  ) ?? groups[0];
