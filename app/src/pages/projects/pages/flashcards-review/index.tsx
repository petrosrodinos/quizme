import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { Routes } from "@/routes/routes";
import { ReviewSession } from "./components/review-session";

export default function ProjectFlashcardsReviewPage() {
    usePageMetadata({ title: "Flashcard review" });
    const { projectId, project } = useProjectContext();
    const navigate = useNavigate();
    const back = () => navigate(Routes.projects.flashcards(projectId));
    return (
        <Main width="narrow">
            <div className="mb-6 flex items-center justify-between">
                <Button variant="ghost" onClick={back}>
                    <ArrowLeft /> Flashcards
                </Button>
                <p className="text-sm text-muted-foreground">{project.title}</p>
            </div>
            <ReviewSession projectId={projectId} onFinish={back} />
        </Main>
    );
}
