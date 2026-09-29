import React from "react";
import {
  LayoutDashboard,
  LogOut,
  Sparkles,
  UserCheck,
  Users,
  Database,
  TrendingUp
} from "lucide-react";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import BoardroomPage from "./pages/BoardroomPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import MemoryPage from "./pages/MemoryPage.jsx";
import { useStudioStore } from "./store/useStudioStore.js";
import { Button } from "./components/ui/Button.jsx";

export default function App() {
  const { auth, logout, selectedProjectId, setSelectedProject, activeView, setActiveView } = useStudioStore();

  // Authentication gate: unauthenticated users see AuthPage
  if (!auth.token || !auth.user) {
    return <AuthPage />;
  }

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
              <p className="text-xs font-medium text-slate-500">
                Turn ideas into investor-ready ventures
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* View navigation switcher */}
            <Button
              id="nav-dashboard-btn"
              variant={activeView === "dashboard" && !selectedProjectId ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setSelectedProject(null);
                setActiveView("dashboard");
              }}
              className="text-xs"
            >
              <LayoutDashboard size={14} />
              Ventures
            </Button>

            {selectedProjectId && (
              <>
                <Button
                  id="nav-workspace-btn"
                  variant={activeView === "studio" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setActiveView("studio")}
                  className="text-xs"
                >
                  <Sparkles size={14} />
                  Studio
                </Button>
                <Button
                  id="nav-boardroom-btn"
                  variant={activeView === "boardroom" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setActiveView("boardroom")}
                  className="text-xs border-indigo-200"
                >
                  <Users size={14} className="text-indigo-600" />
                  Boardroom
                </Button>
              </>
            )}

            {/* Phase 7: Memory Search Button */}
            <Button
              id="nav-memory-btn"
              variant={activeView === "memory" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveView("memory")}
              className="text-xs border-teal-200"
            >
              <Database size={14} className="text-teal-700" />
              Memory & RAG
            </Button>

            {/* Phase 7: Analytics Button */}
            <Button
              id="nav-analytics-btn"
              variant={activeView === "analytics" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveView("analytics")}
              className="text-xs border-indigo-200"
            >
              <TrendingUp size={14} className="text-indigo-600" />
              Analytics
            </Button>

            {/* User identity badge */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm">
              <UserCheck size={15} className="text-emerald-600" />
              <span className="font-semibold text-slate-800">{auth.user.name}</span>
              <span className="text-slate-400">({auth.user.email})</span>
            </div>

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

        {/* Main View Router */}
        <main>
          {activeView === "memory" ? (
            <MemoryPage
              onOpenStudio={(project) => {
                setSelectedProject(project);
                setActiveView("studio");
              }}
            />
          ) : activeView === "analytics" ? (
            <AnalyticsPage
              onOpenStudio={(project) => {
                setSelectedProject(project);
                setActiveView("studio");
              }}
            />
          ) : selectedProjectId ? (
            activeView === "boardroom" ? (
              <BoardroomPage onBack={() => setActiveView("studio")} />
            ) : (
              <ProjectPage
                onBack={() => {
                  setSelectedProject(null);
                  setActiveView("dashboard");
                }}
                onOpenBoardroom={() => setActiveView("boardroom")}
                onOpenAnalytics={() => setActiveView("analytics")}
              />
            )
          ) : (
            <DashboardPage
              onOpenStudio={(project) => {
                setSelectedProject(project);
                setActiveView("studio");
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
