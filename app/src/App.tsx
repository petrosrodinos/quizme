import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import QueryProvider from "./components/providers/query-provider";
import { Toaster } from "./components/ui/toaster";
import { RadixPointerEventsGuard } from "./components/providers/radix-pointer-events-guard";
import { ThemePaletteSwitcher } from "./components/ui/theme-palette-switcher";
/** Dev-only palette/design-system picker, hidden for now. Flip to true to compare themes again. */
const SHOW_THEME_SWITCHER = false;

import "./hooks/use-theme"; // applies the saved theme and follows OS changes

function App() {
    return (
        <BrowserRouter>
            <QueryProvider>
                <AppRoutes />
                <Toaster />
                <RadixPointerEventsGuard />
                {import.meta.env.DEV && SHOW_THEME_SWITCHER && <ThemePaletteSwitcher />}
            </QueryProvider>
        </BrowserRouter>
    );
}

export default App;
