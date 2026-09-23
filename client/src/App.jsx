import React, { useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { getHealth, API_BASE_URL } from "./services/api.js";
import { useAppStore } from "./store/useAppStore.js";
import { Button } from "./components/ui/Button.jsx";

export default function App() {
  const {
    backendStatus,
    databaseMode,
    healthData,
    isLoadingHealth,
    error,
    setHealthData,
    setHealthError,
    setIsLoadingHealth
  } = useAppStore();

  const checkBackendHealth = async () => {
    setIsLoadingHealth(true);
    try {
      setHealthData(await getHealth());
    } catch (err) {
      setHealthError(err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const statuses = [
    { label: "Frontend Runtime", value: "React 18.3 / Vite 6.0", state: "Running", ok: true },
    { label: "Tailwind CSS", value: "Utilities & Tokens Active", state: "Verified", ok: true },
    { label: "Environment", value: `VITE_API_URL: ${API_BASE_URL}`, state: "Loaded", ok: true },
    {
      label: "Backend & Database",
      value: `Mode: ${databaseMode || "connecting..."}`,
      state: backendStatus === "connected" ? "Connected" : isLoadingHealth ? "Checking..." : "Offline",
      ok: backendStatus === "connected"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-teal-700 flex items-center justify-center text-white">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Venture Studio</h1>
              <p className="text-xs uppercase tracking-wider font-semibold text-teal-700">Phase 1: Foundation</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={checkBackendHealth} disabled={isLoadingHealth}>
            <RefreshCw size={13} className={isLoadingHealth ? "animate-spin" : ""} />
            Recheck
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {statuses.map((item) => (
            <div key={item.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    item.ok
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {item.state}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
            <span>Health Endpoint Diagnostics</span>
            <code className="text-slate-400">GET /api/health</code>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono overflow-x-auto">
            {healthData ? JSON.stringify(healthData, null, 2) : error ? `Error: ${error}` : "Checking..."}
          </pre>
        </section>

        <p className="text-xs text-slate-500 text-center">
          Phase 1 Foundation active. Auth, Projects, AI Engine, and Boardroom will build additively in subsequent phases.
        </p>
      </div>
    </div>
  );
}
