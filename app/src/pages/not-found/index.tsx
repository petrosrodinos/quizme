import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Main } from "@/components/layout/main";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/routes";

export default function NotFoundPage() {
    return (
        <Main>
            <EmptyState
                icon={Compass}
                title="Page not found"
                description="The page you're looking for doesn't exist or has moved."
                action={
                    <Button asChild>
                        <Link to={Routes.dashboard}>Go to dashboard</Link>
                    </Button>
                }
            />
        </Main>
    );
}
