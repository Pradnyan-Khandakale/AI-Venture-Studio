import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Layers,
  Sparkles,
  Play,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  GitFork,
  HelpCircle,
  Building2,
  Users,
  Globe,
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  FileText,
  FileCode,
  Code,
  Mail,
  Send,
  Check
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { WorkflowGraph } from "../components/workflow/WorkflowGraph.jsx";
import { StepListView } from "../components/workflow/StepListView.jsx";
import { ReportViewer } from "../components/reports/ReportViewer.jsx";
import { projectApi, exportApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

export default function ProjectPage({ onBack, onOpenBoardroom, onOpenAnalytics }) {
  const queryClient = useQueryClient();
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);

  const [selectedAgentKey, setSelectedAgentKey] = useState("market");
  const [viewMode, setViewMode] = useState("canvas"); // "canvas" | "list"
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Phase 8: Export and Email delivery state
  const [exportState, setExportState] = useState({
    pdf: "idle",
    markdown: "idle",
    json: "idle"
  });
  const [exportFeedback, setExportFeedback] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState("idle"); // "idle" | "loading" | "success" | "error"
  const [emailFeedback, setEmailFeedback] = useState("");

  // Poll project state dynamically: accelerate polling while running
  const { data: project, isLoading, isError, error } = useQuery(
    ["project", selectedProjectId],
    () => projectApi.get(selectedProjectId),
    {
      enabled: Boolean(selectedProjectId),
      refetchInterval: (data) => {
        const isRunning =
          data?.status === "running" ||
          (data?.agentRuns || []).some((r) => r.status === "running");
        return isRunning ? 1200 : 4000;
      }
    }
  );

  // Default selected agent to the first active/pending/reviewable agent
  useEffect(() => {
    if (project?.agentRuns && !selectedAgentKey) {
      const reviewable = project.agentRuns.find((r) => r.status === "completed" && !r.approved);
      const running = project.agentRuns.find((r) => r.status === "running");
      const nextPending = project.agentRuns.find((r) => r.status === "pending");
      const defaultAgent = reviewable || running || nextPending || project.agentRuns[0];
      if (defaultAgent) setSelectedAgentKey(defaultAgent.key);
    }
  }, [project, selectedAgentKey]);

  // Mutations
  const runMutation = useMutation(
    (autoMode) => projectApi.run(selectedProjectId, autoMode),
    {
      onSuccess: (updated) => {
        queryClient.setQueryData(["project", selectedProjectId], updated);
        queryClient.invalidateQueries("projects");
      }
    }
  );

  const approveMutation = useMutation(
    (agentKey) => projectApi.approve(selectedProjectId, agentKey),
    {
      onSuccess: (updated) => {
        queryClient.setQueryData(["project", selectedProjectId], updated);
        queryClient.invalidateQueries("projects");
        // Automatically select the next agent in sequence
        const runs = updated.agentRuns || [];
        const currentIndex = runs.findIndex((r) => r.key === agentKey);
        if (currentIndex >= 0 && currentIndex < runs.length - 1) {
          setSelectedAgentKey(runs[currentIndex + 1].key);
        }
      }
    }
  );

  const regenerateMutation = useMutation(
    (agentKey) => projectApi.regenerate(selectedProjectId, agentKey),
    {
      onSuccess: (updated) => {
        queryClient.setQueryData(["project", selectedProjectId], updated);
        queryClient.invalidateQueries("projects");
      }
    }
  );

  const updateReportMutation = useMutation(
    ({ agentKey, content }) => projectApi.updateReport(selectedProjectId, agentKey, content),
    {
      onSuccess: (updated) => {
        queryClient.setQueryData(["project", selectedProjectId], updated);
        queryClient.invalidateQueries("projects");
      }
    }
  );

  if (isLoading && !project) {
    return (
      <Card className="p-12 text-center space-y-3 font-sans">
        <RefreshCw size={24} className="animate-spin text-teal-700 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Loading Venture Studio Workspace...</h3>
        <p className="text-xs text-muted-foreground">Synchronizing multi-agent graph with server state.</p>
      </Card>
    );
  }

  if (isError || !project) {
    return (
      <Card className="p-10 text-center space-y-4 font-sans">
        <AlertCircle size={32} className="text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Project Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {error?.response?.data?.message || "The requested venture could not be loaded or does not belong to your account."}
        </p>
        <Button id="back-to-projects-error-btn" variant="secondary" onClick={onBack} className="text-xs">
          <ArrowLeft size={14} /> Return to Projects
        </Button>
      </Card>
    );
  }

  const agentRuns = project.agentRuns || [];
  const selectedAgent = agentRuns.find((r) => r.key === selectedAgentKey) || agentRuns[0];
  const completedCount = agentRuns.filter((r) => r.status === "completed").length;
  const progressPercent = Math.round((completedCount / agentRuns.length) * 100);
  const isWorkflowBusy = runMutation.isLoading || agentRuns.some((r) => r.status === "running");

  const handleApprove = (agentKey) => approveMutation.mutate(agentKey);
  const handleRegenerate = (agentKey) => regenerateMutation.mutate(agentKey);
  const handleSaveReport = (agentKey, content) => updateReportMutation.mutateAsync({ agentKey, content });

  const isExporting =
    exportState.pdf === "loading" ||
    exportState.markdown === "loading" ||
    exportState.json === "loading" ||
    emailStatus === "loading";

  const handleExportPdf = async () => {
    try {
      setExportFeedback(null);
      setExportState((s) => ({ ...s, pdf: "loading" }));
      await exportApi.downloadPdf(selectedProjectId, project.startupName);
      setExportState((s) => ({ ...s, pdf: "success" }));
      setExportFeedback({ type: "success", message: "Venture blueprint PDF downloaded successfully." });
      setTimeout(() => {
        setExportState((s) => ({ ...s, pdf: "idle" }));
        setExportFeedback(null);
      }, 3500);
    } catch (err) {
      setExportState((s) => ({ ...s, pdf: "error" }));
      setExportFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to download PDF."
      });
      setTimeout(() => setExportState((s) => ({ ...s, pdf: "idle" })), 4000);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      setExportFeedback(null);
      setExportState((s) => ({ ...s, markdown: "loading" }));
      await exportApi.downloadMarkdown(selectedProjectId, project.startupName);
      setExportState((s) => ({ ...s, markdown: "success" }));
      setExportFeedback({ type: "success", message: "Venture blueprint Markdown downloaded successfully." });
      setTimeout(() => {
        setExportState((s) => ({ ...s, markdown: "idle" }));
        setExportFeedback(null);
      }, 3500);
    } catch (err) {
      setExportState((s) => ({ ...s, markdown: "error" }));
      setExportFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to download Markdown."
      });
      setTimeout(() => setExportState((s) => ({ ...s, markdown: "idle" })), 4000);
    }
  };

  const handleExportJson = async () => {
    try {
      setExportFeedback(null);
      setExportState((s) => ({ ...s, json: "loading" }));
      await exportApi.downloadJson(selectedProjectId, project.startupName);
      setExportState((s) => ({ ...s, json: "success" }));
      setExportFeedback({ type: "success", message: "Venture blueprint JSON downloaded successfully." });
      setTimeout(() => {
        setExportState((s) => ({ ...s, json: "idle" }));
        setExportFeedback(null);
      }, 3500);
    } catch (err) {
      setExportState((s) => ({ ...s, json: "error" }));
      setExportFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to download JSON."
      });
      setTimeout(() => setExportState((s) => ({ ...s, json: "idle" })), 4000);
    }
  };

  const handleSendEmail = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim()) return;
    try {
      setEmailStatus("loading");
      setEmailFeedback("");
      const res = await exportApi.sendEmail(selectedProjectId, emailInput.trim());
      setEmailStatus("success");
      setEmailFeedback(res.message || `Blueprint sent to ${emailInput.trim()}`);
    } catch (err) {
      setEmailStatus("error");
      setEmailFeedback(err.response?.data?.message || err.message || "Email delivery failed.");
    }
  };

  return (
    <div id="project-workspace-shell" className="space-y-5 font-sans">
      {/* Studio Header & Breadcrumbs */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Button
              id="back-to-dashboard-btn"
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="text-xs"
            >
              <ArrowLeft size={13} /> Projects
            </Button>
            <Badge tone={project.status === "completed" ? "completed" : project.status === "failed" ? "failed" : project.status === "running" ? "running" : "pending"}>
              {project.status || "draft"}
            </Badge>
            <span className="text-xs text-slate-400 font-mono">
              {completedCount} / 11 Agents Complete ({progressPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h2 id="project-name-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
              {project.startupName}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <HelpCircle size={14} />
              {showMetadata ? "Hide Details" : "Venture Details"}
            </Button>
          </div>
        </div>

        {/* Studio Primary Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Run Next Agent */}
          <Button
            id="run-next-agent-btn"
            variant="primary"
            size="sm"
            onClick={() => runMutation.mutate(false)}
            disabled={isWorkflowBusy}
            className="text-xs bg-teal-700 hover:bg-teal-800"
          >
            <Play size={13} />
            {runMutation.isLoading ? "Running Engine..." : "Run Next Agent"}
          </Button>

          {/* Auto Mode Run All */}
          <Button
            id="run-auto-mode-btn"
            variant="secondary"
            size="sm"
            onClick={() => setShowAutoConfirm(true)}
            disabled={isWorkflowBusy}
            className="text-xs border-teal-200 hover:bg-teal-50"
          >
            <RefreshCw size={13} className={isWorkflowBusy ? "animate-spin text-teal-700" : "text-teal-700"} />
            Auto Mode (Run All)
          </Button>

          {/* Executive Boardroom Jump Button */}
          {onOpenBoardroom && (
            <Button
              id="open-boardroom-action-btn"
              variant="secondary"
              size="sm"
              onClick={onOpenBoardroom}
              className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Users size={13} className="text-indigo-600" />
              Executive Boardroom
            </Button>
          )}

          {/* Project Analytics Jump Button */}
          {onOpenAnalytics && (
            <Button
              id="open-project-analytics-action-btn"
              variant="secondary"
              size="sm"
              onClick={onOpenAnalytics}
              className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <TrendingUp size={13} className="text-indigo-600" />
              Analytics
            </Button>
          )}

          {/* View Switcher: Canvas Graph vs Step List */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100">
            <button
              id="view-canvas-toggle"
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "canvas" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <GitFork size={13} />
              Graph View
            </button>
            <button
              id="view-list-toggle"
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "list" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={13} />
              Step List
            </button>
          </div>
        </div>
      </section>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Phase 8: Export, Delivery & Blueprint Packaging Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 px-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 flex-shrink-0">
            <Download size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              Investor Blueprint Deliverables
              <Badge tone={completedCount === 11 ? "completed" : "pending"}>
                {completedCount === 11 ? "All 11 Reports Ready" : `${completedCount}/11 Reports Ready`}
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Export comprehensive business plan with health score, financial models, architecture, and GTM strategy.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF */}
          <Button
            id="export-pdf-btn"
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className={`text-xs transition-all ${
              exportState.pdf === "success" ? "border-emerald-300 text-emerald-700 bg-emerald-50" : ""
            }`}
          >
            {exportState.pdf === "loading" ? (
              <RefreshCw size={13} className="animate-spin text-teal-700" />
            ) : exportState.pdf === "success" ? (
              <Check size={13} className="text-emerald-600" />
            ) : (
              <FileText size={13} className="text-teal-700" />
            )}
            {exportState.pdf === "loading"
              ? "Generating PDF..."
              : exportState.pdf === "success"
              ? "PDF Downloaded"
              : "Download PDF"}
          </Button>

          {/* Download Markdown */}
          <Button
            id="export-markdown-btn"
            variant="secondary"
            size="sm"
            onClick={handleExportMarkdown}
            disabled={isExporting}
            className={`text-xs transition-all ${
              exportState.markdown === "success" ? "border-emerald-300 text-emerald-700 bg-emerald-50" : ""
            }`}
          >
            {exportState.markdown === "loading" ? (
              <RefreshCw size={13} className="animate-spin text-teal-700" />
            ) : exportState.markdown === "success" ? (
              <Check size={13} className="text-emerald-600" />
            ) : (
              <FileCode size={13} className="text-teal-700" />
            )}
            {exportState.markdown === "loading"
              ? "Generating MD..."
              : exportState.markdown === "success"
              ? "MD Downloaded"
              : "Download Markdown"}
          </Button>

          {/* Download JSON */}
          <Button
            id="export-json-btn"
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            disabled={isExporting}
            className={`text-xs transition-all ${
              exportState.json === "success" ? "border-emerald-300 text-emerald-700 bg-emerald-50" : ""
            }`}
          >
            {exportState.json === "loading" ? (
              <RefreshCw size={13} className="animate-spin text-teal-700" />
            ) : exportState.json === "success" ? (
              <Check size={13} className="text-emerald-600" />
            ) : (
              <Code size={13} className="text-teal-700" />
            )}
            {exportState.json === "loading"
              ? "Preparing JSON..."
              : exportState.json === "success"
              ? "JSON Downloaded"
              : "Download JSON"}
          </Button>

          {/* Email Blueprint */}
          <Button
            id="open-email-modal-btn"
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowEmailModal(true);
              setEmailStatus("idle");
              setEmailFeedback("");
            }}
            disabled={isExporting}
            className="text-xs border-teal-200 text-teal-800 hover:bg-teal-50"
          >
            <Mail size={13} className="text-teal-700" />
            Email Reports
          </Button>
        </div>
      </div>

      {/* Export Feedback Toast/Alert */}
      {exportFeedback && (
        <div
          id="export-feedback-banner"
          className={`text-xs p-3 rounded-xl flex items-center justify-between gap-3 border shadow-sm ${
            exportFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {exportFeedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            )}
            <span>{exportFeedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportFeedback(null)}
            className="text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Mutation Error Feedback Banner */}
      {runMutation.isError && (
        <div id="workflow-run-error" className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>Workflow Note: {runMutation.error?.response?.data?.message || runMutation.error?.message || "Execution encountered an issue."}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => runMutation.reset()} className="text-xs text-rose-700">
            Dismiss
          </Button>
        </div>
      )}

      {/* Collapsible Venture Metadata Drawer */}
      {showMetadata && (
        <Card className="p-5 space-y-4 bg-white/80 border-slate-200">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-700">Venture Concept</h3>
            <p id="project-idea-text" className="mt-1.5 text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              {project.idea}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 flex items-center gap-1"><Building2 size={12} /> Industry</span>
              <p className="font-semibold text-slate-800 truncate mt-0.5">{project.industry}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 flex items-center gap-1"><Users size={12} /> Target Users</span>
              <p className="font-semibold text-slate-800 truncate mt-0.5">{project.targetUsers}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 flex items-center gap-1"><Globe size={12} /> Country</span>
              <p className="font-semibold text-slate-800 truncate mt-0.5">{project.country || "Global"}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 flex items-center gap-1"><DollarSign size={12} /> Budget</span>
              <p className="font-semibold text-slate-800 truncate mt-0.5">{project.budget || "Stage-appropriate"}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 flex items-center gap-1"><Clock size={12} /> Timeline</span>
              <p className="font-semibold text-slate-800 truncate mt-0.5">{project.timeline || "Milestone-driven"}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty / Initial State Onboarding Banner */}
      {completedCount === 0 && !isWorkflowBusy && (
        <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-teal-900 flex items-center gap-2">
              <Sparkles size={16} className="text-teal-700" />
              Welcome to the AI Venture Studio Workspace
            </h4>
            <p className="text-xs text-teal-800/80 max-w-2xl leading-relaxed">
              All 11 specialist AI agents are initialized and connected in sequential order. Click <strong>Run Next Agent</strong> to trigger Agent 1 (Market Research) or switch to <strong>Auto Mode</strong> to execute the complete pipeline.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => runMutation.mutate(false)}
            className="text-xs bg-teal-700 hover:bg-teal-800 flex-shrink-0"
          >
            <Play size={13} />
            Begin Market Research
          </Button>
        </div>
      )}

      {/* Main Studio Workspace: 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Visual Workflow Canvas or Step List (7 cols on desktop) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-teal-700" />
              11-Agent Workflow Pipeline
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Click node to inspect
            </span>
          </div>

          {viewMode === "canvas" ? (
            <WorkflowGraph
              project={project}
              selectedAgentKey={selectedAgentKey}
              onSelectAgent={(key) => setSelectedAgentKey(key)}
            />
          ) : (
            <Card className="p-4 max-h-[650px] overflow-y-auto">
              <StepListView
                project={project}
                selectedAgentKey={selectedAgentKey}
                onSelectAgent={(key) => setSelectedAgentKey(key)}
              />
            </Card>
          )}
        </div>

        {/* Right Column: Report Viewer & Human Approval Console (5/7 cols on desktop) */}
        <div className="lg:col-span-6 xl:col-span-7">
          <ReportViewer
            agent={selectedAgent}
            project={project}
            onApprove={handleApprove}
            onRegenerate={handleRegenerate}
            onSaveReport={handleSaveReport}
            isApproving={approveMutation.isLoading}
            isRegenerating={regenerateMutation.isLoading}
            isSaving={updateReportMutation.isLoading}
          />
        </div>
      </div>

      {/* Auto Mode Confirmation Modal */}
      {showAutoConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                <RefreshCw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Run Autonomous Venture Engine</h3>
                <p className="text-xs text-muted-foreground">11-Agent Sequential Pipeline</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Auto Mode will automatically execute all remaining pending agents in sequence from <strong>Market Research</strong> through <strong>Pitch Deck</strong> without pausing between steps.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-600">
              <span className="font-semibold text-slate-800">Founder Control Guaranteed:</span>
              <p>You can still review, regenerate, and edit any generated deliverable report after execution completes.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAutoConfirm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                id="confirm-auto-mode-btn"
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowAutoConfirm(false);
                  runMutation.mutate(true);
                }}
                className="text-xs bg-teal-700 hover:bg-teal-800"
              >
                <Play size={13} />
                Start Auto Mode
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 8: Email Blueprint Delivery Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Email Venture Blueprint</h3>
                <p className="text-xs text-muted-foreground">PDF & Markdown Attachments</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              We will package the latest deliverable reports, health scorecard, and executive summary for <strong>{project.startupName}</strong> into formatted PDF and Markdown attachments and dispatch them via email.
            </p>

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label htmlFor="export-email-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  id="export-email-input"
                  type="email"
                  required
                  placeholder="founder@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={emailStatus === "loading"}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                />
              </div>

              {emailFeedback && (
                <div
                  id="email-feedback-status"
                  className={`text-xs p-3 rounded-lg border flex items-center gap-2 ${
                    emailStatus === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {emailStatus === "success" ? (
                    <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
                  )}
                  <span>{emailFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  id="cancel-email-modal-btn"
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEmailModal(false)}
                  disabled={emailStatus === "loading"}
                  className="text-xs"
                >
                  {emailStatus === "success" ? "Close" : "Cancel"}
                </Button>
                {emailStatus !== "success" && (
                  <Button
                    id="send-email-submit-btn"
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={emailStatus === "loading" || !emailInput.trim()}
                    className="text-xs bg-teal-700 hover:bg-teal-800"
                  >
                    {emailStatus === "loading" ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={13} /> Send Blueprint
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
