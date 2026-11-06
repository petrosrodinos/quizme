import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";

export default function NotFoundPage() {
    const { t } = useTranslation();
    usePageMetadata({ title: t("errors.pageNotFoundTitle") });
    return (
        <Main>
            <EmptyState
                icon={Compass}
                title={t("errors.pageNotFoundTitle")}
                description={t("errors.pageNotFoundDescription")}
                action={
                    <Button asChild>
                        <Link to={Routes.dashboard}>{t("actions.goToDashboard")}</Link>
                    </Button>
                }
            />
        </Main>
    );
}
