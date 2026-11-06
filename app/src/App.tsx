import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import QueryProvider from "./components/providers/query-provider";
import { Toaster } from "./components/ui/toaster";
import { RadixPointerEventsGuard } from "./components/providers/radix-pointer-events-guard";
import "./hooks/use-theme"; // applies the saved theme and follows OS changes

function App() {
    return (
        <BrowserRouter>
            <QueryProvider>
                <AppRoutes />
                <Toaster />
                <RadixPointerEventsGuard />
            </QueryProvider>
        </BrowserRouter>
    );
}

export default App;
