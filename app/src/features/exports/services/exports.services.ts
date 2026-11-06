import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { ExportRequest } from "../interfaces/exports.interfaces";

const filenameFrom = (disposition: string | undefined, fallback: string) => {
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition ?? "");
    return m ? decodeURIComponent(m[1]) : fallback;
};

/** Downloads an export as a file. HTML exports open in a new tab and trigger the print dialog (Save as PDF). */
export const downloadExport = ({ projectId, type, format, deck_id }: ExportRequest) =>
    withApiError(async () => {
        const res = await axiosInstance.get<Blob>(ApiRoutes.exports.project(projectId), { params: { type, format, deck_id }, responseType: "blob" });
        const filename = filenameFrom(res.headers["content-disposition"] as string | undefined, `${type}.${format}`);
        const url = URL.createObjectURL(res.data);
        if (format === "html") {
            window.open(url, "_blank", "noopener");
        } else {
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return { filename };
    }, "Export failed.");
