import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import QueryProvider from "./components/providers/query-provider";
import { Toaster } from "./components/ui/toaster";
import { RadixPointerEventsGuard } from "./components/providers/radix-pointer-events-guard";
import { useTheme } from "./hooks/use-theme";

function ThemeApplier() {
    useTheme();
    return null;
}

function App() {
    return (
        <BrowserRouter>
            <QueryProvider>
                <ThemeApplier />
                <AppRoutes />
                <Toaster />
                <RadixPointerEventsGuard />
            </QueryProvider>
        </BrowserRouter>
    );
}

export default App;
