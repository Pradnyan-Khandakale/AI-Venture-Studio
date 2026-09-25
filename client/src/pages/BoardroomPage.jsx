import React, { useState } from "react";
import {
  ArrowLeft,
  Clock,
  Compass,
  Cpu,
  DollarSign,
  Megaphone,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { boardroomApi, projectApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

const ROLE_METADATA = {
  CEO: {
    title: "Chief Executive Officer",
    icon: Compass,
    tone: "border-indigo-200 bg-indigo-50/40 text-indigo-900",
    badgeTone: "bg-indigo-100 text-indigo-800 border-indigo-200",
    focus: "Overall Business Strategy & Execution Priorities"
  },
  CTO: {
    title: "Chief Technology Officer",
    icon: Cpu,
    tone: "border-cyan-200 bg-cyan-50/40 text-cyan-900",
    badgeTone: "bg-cyan-100 text-cyan-800 border-cyan-200",
    focus: "Technical Feasibility, Architecture & Scalability"
  },
  CFO: {
    title: "Chief Financial Officer",
    icon: DollarSign,
    tone: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
    badgeTone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    focus: "Financial Viability, Unit Economics & Runway"
  },
  CMO: {
    title: "Chief Marketing Officer",
    icon: Megaphone,
    tone: "border-amber-200 bg-amber-50/40 text-amber-900",
    badgeTone: "bg-amber-100 text-amber-800 border-amber-200",
    focus: "Market Positioning, Acquisition & GTM Dynamics"
  },
  VC: {
    title: "Lead Venture Capitalist",
    icon: TrendingUp,
    tone: "border-purple-200 bg-purple-50/40 text-purple-900",
    badgeTone: "bg-purple-100 text-purple-800 border-purple-200",
    focus: "Investment Thesis, Defensibility & Scale"
  }
};

const SAMPLE_QUESTIONS = [
  "Should we launch in India first or target the US market first?",
  "Should we adopt a product-led self-serve model or enterprise sales?",
  "What is our biggest technical or business risk before fundraising?",
  "How should we price our initial MVP to achieve healthy margins?"
];

export default function BoardroomPage({ onBack }) {
  const queryClient = useQueryClient();
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);

  const [question, setQuestion] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeRoleTab, setActiveRoleTab] = useState("all"); // "all" | "CEO" | "CTO" | "CFO" | "CMO" | "VC" | "Consensus"

  // Fetch project details for venture context
  const { data: project } = useQuery(
    ["project", selectedProjectId],
    () => projectApi.get(selectedProjectId),
    { enabled: Boolean(selectedProjectId) }
  );

  // Fetch existing boardroom sessions for this venture
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions
  } = useQuery(
    ["boardroomSessions", selectedProjectId],
    () => boardroomApi.listSessions(selectedProjectId),
    {
      enabled: Boolean(selectedProjectId),
      onSuccess: (data) => {
        if (data && data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0]._id || data[0].id);
        }
      }
    }
  );

  // Active session object
  const activeSession = sessions.find((s) => (s._id || s.id) === activeSessionId) || sessions[0] || null;

  // Debate mutation
  const debateMutation = useMutation(
    (questionText) => boardroomApi.debate(selectedProjectId, { question: questionText }),
    {
      onSuccess: (newSession) => {
        queryClient.invalidateQueries(["boardroomSessions", selectedProjectId]);
        setActiveSessionId(newSession._id || newSession.id);
        setQuestion("");
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || debateMutation.isLoading) return;
    debateMutation.mutate(question.trim());
  };

  const messages = activeSession?.messages || [];
  const roleMessages = messages.filter((m) => m.role !== "Founder" && m.role !== "Consensus");
  const founderMessage = messages.find((m) => m.role === "Founder")?.content || activeSession?.question;
  const consensusText = activeSession?.consensus || messages.find((m) => m.role === "Consensus")?.content;

  return (
    <div id="boardroom-workspace-shell" className="space-y-6 font-sans">
      {/* Header & Breadcrumb */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Button
              id="boardroom-back-btn"
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="text-xs"
            >
              <ArrowLeft size={13} /> Studio Workspace
            </Button>
            <Badge tone="running">Phase 6: Executive Boardroom</Badge>
            {project?.startupName && (
              <span className="text-xs font-semibold text-slate-500 truncate">
                {project.startupName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h2 id="boardroom-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Users className="text-teal-700" size={28} />
              Virtual Executive Council
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Convene your AI C-suite (CEO, CTO, CFO, CMO, VC) to stress-test decisions, resolve strategic uncertainty, and synthesize an authoritative consensus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="new-debate-btn"
            variant="secondary"
            size="sm"
            onClick={() => {
              setActiveSessionId(null);
              setQuestion("");
            }}
            className="text-xs border-teal-200 text-teal-800 hover:bg-teal-50"
          >
            <PlusCircle size={14} />
            New Debate Topic
          </Button>
        </div>
      </section>

      {/* Main Boardroom Grid: 2 Columns (Sidebar History + Deliberation Arena) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Session History Sidebar (3 cols) */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-teal-700" />
                Boardroom Sessions ({sessions.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSessions()}
                className="p-1 h-auto text-slate-400 hover:text-slate-700"
                title="Refresh sessions"
              >
                <RefreshCw size={12} className={isLoadingSessions ? "animate-spin" : ""} />
              </Button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                  <p>No boardroom debates yet.</p>
                  <p className="text-[11px] text-slate-400">Ask your first question to convene the council.</p>
                </div>
              ) : (
                sessions.map((s) => {
                  const sId = s._id || s.id;
                  const isSelected = sId === activeSessionId;
                  const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "";
                  return (
                    <button
                      key={sId}
                      type="button"
                      onClick={() => setActiveSessionId(sId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/70 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono flex items-center gap-1">
                          <Clock size={11} /> {dateStr}
                        </span>
                        {s.consensus && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Consensus
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {s.question || s.title}
                      </p>
                      {s.runtimeMs > 0 && (
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                          <span>{(s.runtimeMs / 1000).toFixed(1)}s runtime</span>
                          {s.tokenUsage > 0 && <span>{s.tokenUsage} tokens</span>}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Quick Context Card */}
          {project && (
            <Card className="p-4 text-xs space-y-2.5 bg-slate-50 border-slate-200">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Briefcase size={13} className="text-teal-700" />
                Venture Intelligence
              </h4>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-400">Industry:</span>
                  <span className="font-semibold text-slate-800">{project.industry}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-400">Market:</span>
                  <span className="font-semibold text-slate-800">{project.country || "Global"}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-400">Budget:</span>
                  <span className="font-semibold text-slate-800">{project.budget || "N/A"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Timeline:</span>
                  <span className="font-semibold text-slate-800">{project.timeline || "N/A"}</span>
                </div>
              </div>
            </Card>
          )}
        </aside>

        {/* Right Column: Founder Input & Deliberation Arena (9 cols) */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* Founder Question Prompt Box */}
          <Card className="p-5 space-y-3.5 shadow-sm border-slate-200">
            <div className="flex items-center justify-between">
              <label htmlFor="boardroom-question-input" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquareText size={15} className="text-teal-700" />
                Pose Strategic Question to Executive Council
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                All 5 C-suite roles will deliberate
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                id="boardroom-question-input"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Should FounderFlow AI launch in India first or target the US market first, considering our current budget and six-month timeline?"
                disabled={debateMutation.isLoading}
                className="w-full p-3.5 text-xs font-sans rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent leading-relaxed resize-y text-slate-800 bg-white"
              />

              {/* Sample Question Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Suggestions:</span>
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuestion(q)}
                    disabled={debateMutation.isLoading}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 transition-colors truncate max-w-xs"
                    title={q}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-400">
                  {debateMutation.isLoading
                    ? "Deliberating with C-suite executives in sequence..."
                    : "Responses evaluate strategic, technical, financial, marketing, and investor angles."}
                </div>
                <Button
                  id="submit-boardroom-question-btn"
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={debateMutation.isLoading || !question.trim() || question.trim().length < 5}
                  className="text-xs bg-teal-700 hover:bg-teal-800 px-4"
                >
                  {debateMutation.isLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Council Deliberating...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Convene Council
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Error Banner */}
            {debateMutation.isError && (
              <div id="boardroom-error-alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Boardroom Consultation Halted</strong>
                  <p>{debateMutation.error?.response?.data?.message || debateMutation.error?.message || "Execution encountered an error."}</p>
                  {debateMutation.error?.response?.status === 429 && (
                    <p className="text-[11px] text-amber-700">
                      Gemini API free-tier quota reached. Please wait a brief moment before submitting again.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Active Debate Arena */}
          {debateMutation.isLoading ? (
            <Card className="p-12 text-center space-y-4">
              <RefreshCw size={32} className="animate-spin text-teal-700 mx-auto" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Executive Council in Session</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Consulting CEO, CTO, CFO, CMO, and VC sequentially using unified venture intelligence, followed by consensus synthesis.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {["CEO", "CTO", "CFO", "CMO", "VC", "Consensus"].map((r, i) => (
                  <span key={r} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Step {i + 1}: {r}
                  </span>
                ))}
              </div>
            </Card>
          ) : activeSession ? (
            <div className="space-y-5">
              {/* Question Header Card */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="uppercase tracking-wider font-semibold text-teal-400">Founder Question</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {activeSession.createdAt ? new Date(activeSession.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold leading-relaxed text-white">
                  &ldquo;{founderMessage}&rdquo;
                </h3>
              </div>

              {/* View Switcher Tabs: All Roles vs Role-specific filter vs Consensus */}
              <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveRoleTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeRoleTab === "all"
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Council Overview (All)
                </button>
                {["CEO", "CTO", "CFO", "CMO", "VC"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRoleTab(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeRoleTab === role
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {role}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveRoleTab("Consensus")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeRoleTab === "Consensus"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-amber-800 bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  Consensus Blueprint
                </button>
              </div>

              {/* Consensus Blueprint Card */}
              {(activeRoleTab === "all" || activeRoleTab === "Consensus") && consensusText && (
                <Card id="boardroom-consensus-card" className="p-6 bg-gradient-to-b from-amber-50/50 via-white to-white border-amber-300/80 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Boardroom Consensus Blueprint</h4>
                        <p className="text-xs text-amber-900/80 font-medium">Consolidated Executive Council Synthesis</p>
                      </div>
                    </div>
                    <Badge tone="completed">Authoritative Synthesis</Badge>
                  </div>

                  <div className="text-xs font-sans leading-relaxed text-slate-800 prose prose-xs max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-amber-50/30 p-4 rounded-xl border border-amber-100 overflow-x-auto">
                      {consensusText}
                    </pre>
                  </div>
                </Card>
              )}

              {/* Individual Executive Role Cards */}
              <div className="space-y-4">
                {roleMessages
                  .filter((m) => activeRoleTab === "all" || activeRoleTab === m.role)
                  .map((msg) => {
                    const meta = ROLE_METADATA[msg.role] || {
                      title: msg.role,
                      icon: UserCheck,
                      tone: "border-slate-200 bg-slate-50 text-slate-900",
                      badgeTone: "bg-slate-100 text-slate-800",
                      focus: "Executive Perspective"
                    };
                    const Icon = meta.icon;

                    return (
                      <Card
                        key={msg.role}
                        id={`role-card-${msg.role.toLowerCase()}`}
                        className={`p-5 rounded-2xl border transition-all shadow-sm ${meta.tone}`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-800">
                              <Icon size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">{meta.title}</h4>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${meta.badgeTone}`}>
                                  {msg.role}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">{meta.focus}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            Deliberated
                          </span>
                        </div>

                        {/* Executive Response Body */}
                        <div className="text-xs text-slate-800 leading-relaxed">
                          <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white/90 p-4 rounded-xl border border-slate-200/80 overflow-x-auto shadow-inner">
                            {msg.content}
                          </pre>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center space-y-3">
              <Users size={36} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Boardroom Ready for Consultation</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Submit a strategic decision, market query, or tradeoff question above to convene your AI executive council.
              </p>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
