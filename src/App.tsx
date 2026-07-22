import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RepoProvider } from "./state/RepoProvider";
import { SessionProvider } from "./state/SessionProvider";
import { HomeNarrativePage } from "./pages/HomeNarrativePage";
import { RecommendPage } from "./pages/RecommendPage";
import { ListenFollowUpPage } from "./pages/ListenFollowUpPage";
import { ReportPage } from "./pages/ReportPage";
import { CaseReplayPage } from "./pages/CaseReplayPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";

export default function App() {
  return (
    <RepoProvider>
      <SessionProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomeNarrativePage />} />
              <Route path="/recommend" element={<RecommendPage />} />
              <Route path="/listen" element={<ListenFollowUpPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/workbench" element={<WorkbenchPage />} />
              <Route path="/replay" element={<CaseReplayPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </SessionProvider>
    </RepoProvider>
  );
}
