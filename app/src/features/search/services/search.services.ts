import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { withApiError } from "@/lib/api-error";
import type { SearchQuery, SearchResults } from "../interfaces/search.interfaces";

export const search = (query: SearchQuery) =>
    withApiError(
        async () => (await axiosInstance.get<SearchResults>(ApiRoutes.search.prefix, { params: { ...query, semantic: String(query.semantic ?? true) } })).data,
        "Search failed.",
    );
