import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { Routes } from "@/routes/routes";
import { ReviewSession } from "./components/review-session";
import { useTranslation } from "react-i18next";
import { useIsPlayful } from "@/hooks/use-ui-mode";
import { X } from "lucide-react";

export default function ProjectFlashcardsReviewPage() {
    const { t } = useTranslation("flashcards");
    usePageMetadata({ title: t("review.pageTitle") });
    const { projectId, project } = useProjectContext();
    const navigate = useNavigate();
    const playful = useIsPlayful();
    const back = () => navigate(playful ? Routes.dashboard : Routes.projects.flashcards(projectId));
    return (
        <Main width="narrow">
            <div className="mb-6 flex items-center justify-between">
                {playful ? (
                    <Button variant="ghost" size="icon" onClick={back} aria-label={t("page.title")}>
                        <X className="!size-7" strokeWidth={2.8} />
                    </Button>
                ) : (
                    <Button variant="ghost" onClick={back}>
                        <ArrowLeft /> {t("page.title")}
                    </Button>
                )}
                <p className="text-sm text-muted-foreground">{project.title}</p>
            </div>
            <ReviewSession projectId={projectId} onFinish={back} />
        </Main>
    );
}
