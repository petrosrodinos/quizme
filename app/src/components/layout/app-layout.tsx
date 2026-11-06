import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { PageSkeleton } from "@/components/ui/card-skeletons";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { GamificationEventsProvider } from "@/components/providers/gamification-events-provider";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { useMe } from "@/features/auth/hooks/use-auth";

/** Authenticated application shell: sidebar + header + realtime/gamification providers. */
export default function AppLayout() {
    useMe();
    return (
        <PreferencesProvider>
            <RealtimeProvider>
                <GamificationEventsProvider>
                    <TooltipProvider delayDuration={200}>
                        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
                            Skip to content
                        </a>
                        <SidebarProvider>
                            <AppSidebar />
                            <SidebarInset className="min-w-0 bg-background">
                                <Header />
                                <EmailVerificationBanner />
                                <Suspense fallback={<PageSkeleton />}>
                                    <Outlet />
                                </Suspense>
                            </SidebarInset>
                        </SidebarProvider>
                    </TooltipProvider>
                </GamificationEventsProvider>
            </RealtimeProvider>
        </PreferencesProvider>
    );
}
