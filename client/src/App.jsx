import React, { useState } from "react";
import { Activity, CheckCircle2, LogOut, ShieldCheck, UserCheck, RefreshCw } from "lucide-react";
import AuthPage from "./pages/AuthPage.jsx";
import { useStudioStore } from "./store/useStudioStore.js";
import { authApi } from "./services/api.js";
import { Button } from "./components/ui/Button.jsx";

export default function App() {
  const { auth, logout } = useStudioStore();
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Venture Studio</h1>
              <p className="text-xs uppercase tracking-wider font-semibold text-teal-700">
                Phase 2: Authentication
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm">
              <UserCheck size={15} className="text-emerald-600" />
              <span className="font-semibold text-slate-800">{auth.user.name}</span>
              <span className="text-slate-400">({auth.user.email})</span>
            </div>
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

        {/* Authenticated Workspace Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User Identity Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShieldCheck size={18} className="text-teal-600" />
                <span>Verified User Identity</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 size={13} />
                Authenticated
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>User ID:</span>
                <span className="font-mono text-slate-900">{auth.user.id || auth.user._id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Name:</span>
                <span className="font-semibold text-slate-900">{auth.user.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Email:</span>
                <span className="font-mono text-slate-900">{auth.user.email}</span>
              </div>
            </div>
          </section>

          {/* JWT & Bearer Auth Test */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Activity size={18} className="text-teal-600" />
                <span>Protected Route Verification</span>
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
            <p className="text-xs text-slate-500">
              Tests Axios request interceptor with Bearer JWT token against backend auth middleware.
            </p>
            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono text-slate-700 border border-slate-100 truncate">
              Token: {auth.token ? `${auth.token.slice(0, 24)}...` : "None"}
            </div>
          </section>
        </div>

        {/* Protected Endpoint Live Response */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-700">Protected Endpoint Diagnostics</h2>
            <code className="text-xs font-mono text-slate-400">GET /api/auth/me</code>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
            {isVerifying
              ? "Validating Bearer token..."
              : meResult
              ? JSON.stringify(meResult, null, 2)
              : verifyError
              ? `Error: ${verifyError}`
              : 'Click "Test /api/auth/me" to verify the current session via JWT Bearer authentication.'}
          </pre>
        </section>

        {/* Phase Scope Notice */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 space-y-1">
          <p className="font-semibold">Phase 2: Authentication Complete</p>
          <p className="text-teal-800">
            User registration, login, bcrypt password hashing, JWT signing/verification, and persistent state are fully functional. Project creation, multi-agent engine, and boardroom will be implemented in subsequent phases.
          </p>
        </div>
      </div>
    </div>
  );
}
