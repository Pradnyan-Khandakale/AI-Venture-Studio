import React, { useState } from "react";
import { Activity, LayoutDashboard, LogOut, ShieldCheck, Sparkles, UserCheck, RefreshCw } from "lucide-react";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import { useStudioStore } from "./store/useStudioStore.js";
import { authApi } from "./services/api.js";
import { Button } from "./components/ui/Button.jsx";

export default function App() {
  const { auth, logout, selectedProjectId, setSelectedProject } = useStudioStore();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [meResult, setMeResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  // Authentication gate: unauthenticated users see AuthPage
  if (!auth.token || !auth.user) {
    return <AuthPage />;
  }

  const verifyMe = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const data = await authApi.me();
      setMeResult(data);
    } catch (err) {
      setVerifyError(err.response?.data?.message || err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Venture Studio</h1>
              <p className="text-xs uppercase tracking-wider font-semibold text-teal-700">
                Phase 5: Studio Workspace
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View navigation switcher */}
            <Button
              id="nav-dashboard-btn"
              variant={!selectedProjectId ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedProject(null)}
              className="text-xs"
            >
              <LayoutDashboard size={14} />
              Projects Dashboard
            </Button>

            {selectedProjectId && (
              <Button
                id="nav-workspace-btn"
                variant="primary"
                size="sm"
                className="text-xs"
              >
                <Sparkles size={14} />
                Studio Workspace
              </Button>
            )}

            {/* User identity badge */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm">
              <UserCheck size={15} className="text-emerald-600" />
              <span className="font-semibold text-slate-800">{auth.user.name}</span>
              <span className="text-slate-400">({auth.user.email})</span>
            </div>

            {/* Diagnostics toggle for Phase 2 /me testing */}
            <Button
              id="toggle-diagnostics-btn"
              variant="secondary"
              size="sm"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-xs"
              title="Toggle JWT Diagnostics"
            >
              <ShieldCheck size={14} className="text-teal-600" />
              Auth Diagnostics
            </Button>

            {/* Sign out */}
            <Button
              id="logout-btn"
              variant="secondary"
              size="sm"
              onClick={logout}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <LogOut size={14} />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Collapsible Session / Diagnostics Bar for Phase 2 Regression Checks */}
        {showDiagnostics && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Activity size={16} className="text-teal-600" />
                <span>Protected Route Diagnostic (GET /api/auth/me)</span>
              </div>
              <Button
                id="verify-token-btn"
                variant="secondary"
                size="sm"
                onClick={verifyMe}
                disabled={isVerifying}
                className="text-xs"
              >
                <RefreshCw size={12} className={isVerifying ? "animate-spin" : ""} />
                Test /api/auth/me
              </Button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
              {isVerifying
                ? "Validating Bearer token..."
                : meResult
                ? JSON.stringify(meResult, null, 2)
                : verifyError
                ? `Error: ${verifyError}`
                : 'Click "Test /api/auth/me" to test token authentication.'}
            </pre>
          </div>
        )}

        {/* Main View Router */}
        <main>
          {selectedProjectId ? (
            <ProjectPage onBack={() => setSelectedProject(null)} />
          ) : (
            <DashboardPage onOpenStudio={(project) => setSelectedProject(project)} />
          )}
        </main>
      </div>
    </div>
  );
}
