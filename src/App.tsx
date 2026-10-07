import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MetaPixelTracker } from "@/components/MetaPixelTracker";

/** Everything below the router — shared by the browser app and the build-time prerender (entry-server.tsx). */
export function AppShell() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <MetaPixelTracker />
      <AppRoutes />
    </AuthProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
