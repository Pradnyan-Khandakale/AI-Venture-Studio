import { BarChart3, BrainCircuit, Download, FileText, LayoutDashboard, LogOut, Mail, Rocket } from "lucide-react";
import { useState } from "react";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import BoardroomPage from "./pages/BoardroomPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { Button } from "./components/ui/Button";
import { useStudioStore } from "./store/useStudioStore";

const tabs = [
  { id: "dashboard", label: "Projects", icon: LayoutDashboard },
  { id: "studio", label: "Studio", icon: Rocket },
  { id: "boardroom", label: "Boardroom", icon: BrainCircuit },
  { id: "analytics", label: "Analytics", icon: BarChart3 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { auth, logout } = useStudioStore();

  if (!auth.token) return <AuthPage />;

  const renderPage = () => {
    if (activeTab === "studio") return <ProjectPage />;
    if (activeTab === "boardroom") return <BoardroomPage />;
    if (activeTab === "analytics") return <AnalyticsPage />;
    return <DashboardPage onOpenStudio={() => setActiveTab("studio")} />;
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-border bg-white/80 px-4 py-5 backdrop-blur lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
            <Rocket size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Studio</p>
            <h1 className="text-lg font-bold">AI Venture</h1>
          </div>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-muted"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 space-y-2">
          <div className="rounded-lg border border-border bg-white p-3 text-xs text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <FileText size={15} />
              Export stack
            </div>
            PDF, Markdown, JSON, and email delivery are wired through the backend.
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2 font-bold">
            <Rocket size={19} />
            AI Venture Studio
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </Button>
        </header>
        <div className="border-b border-border bg-white/60 px-4 py-2 lg:hidden">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-10 items-center justify-center rounded-md ${
                    activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                  title={tab.label}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{renderPage()}</div>
      </main>
    </div>
  );
}
