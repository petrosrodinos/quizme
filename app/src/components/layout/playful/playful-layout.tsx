import { Suspense } from "react";
import { matchPath, Outlet, useLocation } from "react-router-dom";
import { PageSkeleton } from "@/components/ui/card-skeletons";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { BottomTabBar } from "./bottom-tab-bar";
import { PlayfulRightRail } from "./playful-right-rail";
import { PlayfulSideNav } from "./playful-side-nav";
import { PlayfulTopBar } from "./playful-top-bar";

/** Full-screen "lesson" routes: no navigation chrome, like a native learning app. */
const IMMERSIVE = ["/projects/:projectId/quizzes/:quizId/take", "/projects/:projectId/attempts/:attemptId", "/projects/:projectId/flashcards/review", "/games/:gameId"];
/** Routes that get the stats/goal column on wide desktops. */
const WITH_RAIL = [Routes.dashboard, Routes.study, Routes.achievements, Routes.profile, Routes.projects.root, Routes.notifications];

const matches = (patterns: string[], pathname: string) => patterns.some((p) => matchPath({ path: p, end: true }, pathname));

/** Mobile-first app shell: bottom tabs on phones, icon/label rail on desktop, optional right stats column. */
export const PlayfulLayout = () => {
    const { pathname } = useLocation();
    const immersive = matches(IMMERSIVE, pathname);
    const rail = !immersive && matches(WITH_RAIL, pathname);

    if (immersive) {
        return (
            <div className="min-h-dvh bg-background">
                <Suspense fallback={<PageSkeleton />}>
                    <Outlet />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-background">
            <PlayfulSideNav />
            <div className="min-w-0 lg:pl-[88px] xl:pl-64">
                <PlayfulTopBar hideOnWide={rail} />
                <EmailVerificationBanner />
                <div className={cn("mx-auto flex w-full min-w-0 gap-10", rail && "max-w-[1100px] xl:px-6")}>
                    <div className="min-w-0 flex-1">
                        <Suspense fallback={<PageSkeleton />}>
                            <Outlet />
                        </Suspense>
                    </div>
                    {rail && <PlayfulRightRail />}
                </div>
            </div>
            <BottomTabBar />
        </div>
    );
};
