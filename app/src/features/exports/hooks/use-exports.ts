import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { downloadExport } from "../services/exports.services";

export const useExport = () =>
    useMutation({
        mutationFn: downloadExport,
        onSuccess: (r) => toast({ title: "Export ready", description: r.filename, duration: 2000 }),
        onError: (e: Error) => toast({ title: "Export failed", description: e.message, variant: "error" }),
    });
