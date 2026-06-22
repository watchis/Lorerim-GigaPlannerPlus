import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { loadAppData } from "@/data/loader";
import { getBuildFromUrl } from "@/engine/buildCodec";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { LandingPage } from "@/pages/LandingPage";
import { PlannerPage } from "@/pages/PlannerPage";
import { BuildsPage } from "@/pages/BuildsPage";
import { useBuildStore } from "@/store/buildStore";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

function LandingOrRedirect() {
  const location = useLocation();
  if (getBuildFromUrl()) {
    return <Navigate to={`/planner${location.search}`} replace />;
  }
  return <LandingPage />;
}

function AppRoutes() {
  const gameData = useBuildStore((s) => s.gameData);
  if (!gameData) return <LoadingScreen />;

  return (
    <ThemeProvider theme={gameData.ui.theme} labels={gameData.ui.labels}>
      <TooltipProvider delayDuration={100} skipDelayDuration={0} disableHoverableContent={false}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<LandingOrRedirect />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="builds" element={<BuildsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const init = useBuildStore((s) => s.init);

  useEffect(() => {
    const finish = () => {
      try {
        init(loadAppData());
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    };

    if (useBuildStore.persist.hasHydrated()) {
      finish();
      return;
    }

    return useBuildStore.persist.onFinishHydration(finish);
  }, [init]);

  if (error) {
    return (
      <BrowserRouter basename={routerBasename}>
        <ErrorScreen message={`Failed to load planner data: ${error}`} />
      </BrowserRouter>
    );
  }

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter basename={routerBasename}>
      <AppRoutes />
    </BrowserRouter>
  );
}
