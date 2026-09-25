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
  CheckCircle2
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { WorkflowGraph } from "../components/workflow/WorkflowGraph.jsx";
import { StepListView } from "../components/workflow/StepListView.jsx";
import { ReportViewer } from "../components/reports/ReportViewer.jsx";
import { projectApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

export default function ProjectPage({ onBack, onOpenBoardroom }) {
  const queryClient = useQueryClient();
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);

  const [selectedAgentKey, setSelectedAgentKey] = useState("market");
  const [viewMode, setViewMode] = useState("canvas"); // "canvas" | "list"
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

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
    </div>
  );
}
