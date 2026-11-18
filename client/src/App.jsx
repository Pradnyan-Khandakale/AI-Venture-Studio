import React, { Suspense, lazy, useEffect } from "react";
import {
  AlertCircle,
  Database,
  LayoutDashboard,
  LogIn,
  LogOut,
  RefreshCw,
  Server,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users
} from "lucide-react";
import { useQueryClient } from "react-query";
import AuthPage from "./pages/AuthPage.jsx";
import { STARTUP_STATES, useAppStore } from "./store/useAppStore.js";
import { useStudioStore } from "./store/useStudioStore.js";
import { initializeApplication } from "./services/backendLifecycle.js";
import { Button } from "./components/ui/Button.jsx";
import { Card } from "./components/ui/Card.jsx";

// Lazy-load heavy workspace views so initial page load stays fast and small
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ProjectPage = lazy(() => import("./pages/ProjectPage.jsx"));
const BoardroomPage = lazy(() => import("./pages/BoardroomPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const MemoryPage = lazy(() => import("./pages/MemoryPage.jsx"));

function PageLoader({ label = "Loading workspace..." }) {
  return (
    <Card className="p-12 text-center space-y-3 font-sans">
      <RefreshCw size={24} className="animate-spin text-teal-700 mx-auto" />
      <p className="text-sm font-semibold text-slate-700">{label}</p>
    </Card>
  );
}

const LOADING_STATE_COPY = {
  [STARTUP_STATES.CHECKING_BACKEND]: {
    title: "Checking server connection...",
    description: "Verifying that the AI Venture Studio backend is online.",
    badge: "checking_backend"
  },
  [STARTUP_STATES.BACKEND_WAKING]: {
    title: "Starting the server. This may take a moment.",
    description:
      "The Render backend is waking up from sleep. Your session is preserved and your workspace will load automatically once the server responds.",
    badge: "backend_waking"
  },
  [STARTUP_STATES.CHECKING_SESSION]: {
    title: "Restoring your session...",
    description: "Server is online. Confirming your saved credentials with /api/auth/me.",
    badge: "checking_session"
  }
};

export default function App() {
  const queryClient = useQueryClient();
  const {
    auth,
    logout,
    selectedProjectId,
    setSelectedProject,
    activeView,
    setActiveView
  } = useStudioStore();

  const {
    startupState,
    elapsedSeconds,
    attempt,
    error: startupError,
    enterLoginView
  } = useAppStore();

  // Single deduplicated startup sequence on mount (StrictMode safe)
  useEffect(() => {
    initializeApplication();
  }, []);

  // Purge cached user data whenever the user signs out
  useEffect(() => {
    if (!auth.token) {
      queryClient.clear();
    }
  }, [auth.token, queryClient]);

  const handleLogout = () => {
    logout();
    useAppStore.getState().setStartupState(STARTUP_STATES.UNAUTHENTICATED, { error: null });
    queryClient.clear();
  };

  const handleRetryStartup = () => {
    initializeApplication({ force: true });
  };

  // Rule: Do not require authentication or MongoDB readiness to display the login page.
  // If there is no saved token, or the user is explicitly in the unauthenticated state, show AuthPage immediately.
  if (!auth.token || startupState === STARTUP_STATES.UNAUTHENTICATED) {
    return <AuthPage />;
  }

  // Active bounded startup progress states (ONLY reached when a saved token exists)
  if (
    startupState === STARTUP_STATES.CHECKING_BACKEND ||
    startupState === STARTUP_STATES.BACKEND_WAKING ||
    startupState === STARTUP_STATES.CHECKING_SESSION
  ) {
    const isWaking = startupState === STARTUP_STATES.BACKEND_WAKING;
    const copy = LOADING_STATE_COPY[startupState];

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 font-sans">
        <Card className="w-full max-w-md p-8 text-center space-y-4 shadow-lg border-slate-200">
          <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mx-auto">
            {isWaking ? <Server size={22} className="animate-pulse" /> : <RefreshCw size={22} className="animate-spin" />}
          </div>
          <div className="space-y-1.5">
            <h2 id="startup-status-heading" className="text-lg font-bold text-slate-900">
              {copy.title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{copy.description}</p>
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-slate-100 rounded-lg px-3 py-2 space-y-0.5">
            <p>
              Status: <span className="font-semibold text-slate-700">{copy.badge}</span>
              {elapsedSeconds > 0 ? ` • ${elapsedSeconds}s elapsed` : ""}
            </p>
            {isWaking && attempt > 1 && <p>Health check attempt #{attempt}</p>}
          </div>

          {elapsedSeconds >= 5 && (
            <div className="pt-1 flex items-center justify-center gap-2">
              <Button
                id="startup-continue-login-btn"
                variant="secondary"
                size="sm"
                onClick={enterLoginView}
                className="text-xs"
              >
                <LogIn size={13} />
                Continue to Login
              </Button>
            </div>
          )}
        </Card>
      </main>
    );
  }

  // Terminal recoverable error states (token is PRESERVED — never wiped on timeout/503/network failure)
  if (
    startupState === STARTUP_STATES.BACKEND_UNAVAILABLE ||
    startupState === STARTUP_STATES.SESSION_ERROR ||
    !auth.user
  ) {
    const isSessionErr = startupState === STARTUP_STATES.SESSION_ERROR;

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 font-sans">
        <Card className="w-full max-w-md p-8 text-center space-y-4 shadow-lg border-slate-200">
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1.5">
            <h2 id="startup-error-heading" className="text-lg font-bold text-slate-900">
              {isSessionErr ? "Could Not Restore Session" : "Server Temporarily Unavailable"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {startupError ||
                (isSessionErr
                  ? "The server is online, but we could not verify your session right now. Your saved token has been preserved."
                  : "The backend server did not respond in time. Your session has been preserved.")}
            </p>
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-slate-100 rounded-lg px-3 py-1.5">
            State: <span className="font-semibold text-slate-700">{startupState}</span>
            {elapsedSeconds > 0 ? ` • Waited ${elapsedSeconds}s` : ""}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              id="retry-connection-btn"
              variant="primary"
              size="sm"
              onClick={handleRetryStartup}
              className="text-xs bg-teal-700 hover:bg-teal-800"
            >
              <RefreshCw size={14} />
              Retry
            </Button>
            <Button
              id="continue-to-login-btn"
              variant="secondary"
              size="sm"
              onClick={enterLoginView}
              className="text-xs"
            >
              <LogIn size={14} />
              Continue to Login
            </Button>
            <Button
              id="signout-fallback-btn"
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <LogOut size={14} />
              Sign Out
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  // startupState === STARTUP_STATES.AUTHENTICATED
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

            {/* Memory Search Button */}
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

            {/* Analytics Button */}
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
              onClick={handleLogout}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <LogOut size={14} />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Main View Router */}
        <main>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </main>
      </div>
    </div>
  );
}
