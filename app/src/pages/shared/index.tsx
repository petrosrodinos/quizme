import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, LinkIcon, LogIn } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { displayName } from "@/lib/display-name";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { getSharePermissionLabel, getShareResourceTypeLabel } from "@/config/constants/dropdowns/collaboration/share-form.options";
import { useCopyShared, useJoinSharedProject, useSharedView } from "@/features/shares/hooks/use-shares";
import type { CopySharedResult } from "@/features/shares/interfaces/shares.interfaces";
import { SharedContent } from "./components/shared-content";
import { CopyToProjectDialog } from "./components/copy-to-project-dialog";

/** Opens shared content either by link token (/shared/:token) or by share id (/shared/id/:shareId). */
export default function SharedPage() {
    const { token, shareId } = useParams<{ token?: string; shareId?: string }>();
    const navigate = useNavigate();
    const by = shareId ? { id: shareId } : { token };
    const { data: view, isPending, isError, error } = useSharedView(by);
    const join = useJoinSharedProject();
    const copy = useCopyShared();
    const [copyOpen, setCopyOpen] = useState(false);
    usePageMetadata({ title: view?.title ?? "Shared content" });

    const goToResult = (r: CopySharedResult) => {
        if (r.kind === "quiz" && r.quiz_id) navigate(Routes.projects.quizzes(r.project_id));
        else if (r.kind === "deck") navigate(Routes.projects.flashcards(r.project_id));
        else if (r.kind === "note") navigate(Routes.projects.notes(r.project_id));
        else navigate(Routes.projects.detail(r.project_id));
    };

    const doCopy = (targetProjectId?: string) =>
        copy.mutate(
            { ...by, targetProjectId },
            {
                onSuccess: (r) => {
                    setCopyOpen(false);
                    goToResult(r);
                },
            },
        );

    if (isPending)
        return (
            <Main width="narrow">
                <DetailSkeleton />
            </Main>
        );

    if (isError || !view)
        return (
            <Main width="narrow">
                <EmptyState icon={LinkIcon} title="Shared content unavailable" description={error?.message ?? "The link may have expired or been revoked."} />
            </Main>
        );

    const isProject = view.resource_type === "PROJECT";
    const canCopy = view.can_copy && view.resource_type !== "DOCUMENT" && view.resource_type !== "STUDY_PLAN";

    return (
        <Main width="narrow">
            <PageHeader
                eyebrow={getShareResourceTypeLabel(view.resource_type)}
                title={view.title}
                actions={
                    <div className="flex flex-wrap gap-2">
                        {isProject && token && !view.is_member ? (
                            <Button loading={join.isPending} onClick={() => join.mutate(token, { onSuccess: (r) => navigate(Routes.projects.detail(r.project_id)) })}>
                                <LogIn className="mr-2 h-4 w-4" /> Join project
                            </Button>
                        ) : null}
                        {canCopy ? (
                            <Button variant="outline" loading={isProject && copy.isPending} onClick={() => (isProject ? doCopy() : setCopyOpen(true))}>
                                <Copy className="mr-2 h-4 w-4" /> {isProject ? "Make my own copy" : "Copy to my project"}
                            </Button>
                        ) : null}
                    </div>
                }
            />
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {view.sharer ? (
                    <span className="inline-flex items-center gap-2">
                        <UserAvatar name={displayName(view.sharer)} src={view.sharer.avatar_url} className="h-6 w-6" />
                        Shared by {displayName(view.sharer)}
                    </span>
                ) : null}
                <Badge variant="outline">{getSharePermissionLabel(view.permission)}</Badge>
                {view.is_member ? <Badge variant="secondary">You're a member of this project</Badge> : null}
            </div>
            <SharedContent view={view} />
            <CopyToProjectDialog open={copyOpen} onOpenChange={setCopyOpen} isPending={copy.isPending} onConfirm={(pid) => doCopy(pid)} />
        </Main>
    );
}
