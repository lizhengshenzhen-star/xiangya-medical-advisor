import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "./components/AppShell";
import { RepoProvider } from "./state/RepoProvider";
import { SessionProvider } from "./state/SessionProvider";
import { CurrentUserProvider } from "./state/CurrentUserProvider";
import { AppHomePage } from "./pages/app/AppHomePage";
import { MatchPage } from "./pages/app/MatchPage";
import { ResultPage } from "./pages/app/ResultPage";
import { HistoryPage } from "./pages/app/HistoryPage";
import { HistoryDetailPage } from "./pages/app/HistoryDetailPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminConsultsPage } from "./pages/admin/AdminConsultsPage";
import { AdminConsultDetailPage } from "./pages/admin/AdminConsultDetailPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminDoctorsPage } from "./pages/admin/AdminDoctorsPage";
import { AdminDoctorDetailPage } from "./pages/admin/AdminDoctorDetailPage";
import { RecommendPage } from "./pages/RecommendPage";
import { ListenFollowUpPage } from "./pages/ListenFollowUpPage";
import { ReportPage } from "./pages/ReportPage";
import { CaseReplayPage } from "./pages/CaseReplayPage";
import { useCurrentUser } from "./state/CurrentUserProvider";

function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();
  if (loading) return <div className="p-4 text-sm text-slate-500">加载中…</div>;
  if (user?.role !== "admin") {
    return (
      <div className="decision-root mx-auto max-w-[480px] space-y-3 p-6">
        <h1 className="text-xl font-bold">需要管理员身份</h1>
        <p className="text-sm text-slate-600">
          请在右上角切换到「演示管理员」，再进入后台。
        </p>
        <a className="text-medical-700 underline" href="/app">
          返回工作台
        </a>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <RepoProvider>
      <SessionProvider>
        <CurrentUserProvider>
          <BrowserRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/app" replace />} />
                <Route path="/app" element={<AppHomePage />} />
                <Route path="/app/match" element={<MatchPage />} />
                <Route path="/app/result/:consultId" element={<ResultPage />} />
                <Route path="/app/history" element={<HistoryPage />} />
                <Route path="/app/history/:id" element={<HistoryDetailPage />} />

                <Route
                  path="/admin"
                  element={
                    <AdminGate>
                      <AdminDashboardPage />
                    </AdminGate>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminGate>
                      <AdminUsersPage />
                    </AdminGate>
                  }
                />
                <Route
                  path="/admin/consults"
                  element={
                    <AdminGate>
                      <AdminConsultsPage />
                    </AdminGate>
                  }
                />
                <Route
                  path="/admin/consults/:id"
                  element={
                    <AdminGate>
                      <AdminConsultDetailPage />
                    </AdminGate>
                  }
                />
                <Route
                  path="/admin/doctors"
                  element={
                    <AdminGate>
                      <AdminDoctorsPage />
                    </AdminGate>
                  }
                />
                <Route
                  path="/admin/doctors/:id"
                  element={
                    <AdminGate>
                      <AdminDoctorDetailPage />
                    </AdminGate>
                  }
                />

                {/* 兼容旧入口 */}
                <Route path="/recommend" element={<RecommendPage />} />
                <Route path="/listen" element={<ListenFollowUpPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/workbench" element={<Navigate to="/app/history" replace />} />
                <Route path="/replay" element={<CaseReplayPage />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </AppShell>
          </BrowserRouter>
        </CurrentUserProvider>
      </SessionProvider>
    </RepoProvider>
  );
}
