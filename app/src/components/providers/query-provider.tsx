import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type FC, useState } from "react";

interface QueryProviderProps {
    children: React.ReactNode;
}

const QueryProvider: FC<QueryProviderProps> = ({ children }) => {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        refetchOnWindowFocus: false,
                        staleTime: 15_000,
                        retry: (count, error) => count < 2 && !/not found|permission|unauthor/i.test((error as Error)?.message ?? ""),
                    },
                },
            }),
    );
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default QueryProvider;
