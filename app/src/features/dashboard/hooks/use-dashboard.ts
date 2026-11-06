import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboard.services";

export const useDashboard = () => useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, staleTime: 30_000 });
