import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { downloadExport } from "../services/exports.services";
import { tr } from "@/lib/i18n-options";

export const useExport = () =>
    useMutation({
        mutationFn: downloadExport,
        onSuccess: (r) => toast({ title: tr("exports:toasts.ready"), description: r.filename, duration: 2000 }),
        onError: (e: Error) => toast({ title: tr("exports:toasts.failed"), description: e.message, variant: "error" }),
    });
