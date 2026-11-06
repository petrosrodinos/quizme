import { useEffect } from "react";
import { environments } from "@/config/environments";

interface UsePageMetadataOptions {
    title?: string;
}

/** Sets the document title as "<title> · QuizMe". */
export const usePageMetadata = ({ title }: UsePageMetadataOptions) => {
    useEffect(() => {
        document.title = title ? `${title} · ${environments.APP_NAME}` : environments.APP_NAME;
        return () => {
            document.title = environments.APP_NAME;
        };
    }, [title]);
};
