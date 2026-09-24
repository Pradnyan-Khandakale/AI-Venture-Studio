import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Layers,
  ShieldCheck,
  Building2,
  Users,
  Globe,
  DollarSign,
  Clock,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { projectApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

export default function ProjectPage({ onBack }) {
  const queryClient = useQueryClient();
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);
  const [activeReportKey, setActiveReportKey] = useState(null);

  const { data: project, isLoading, isError, error } = useQuery(
    ["project", selectedProjectId],
    () => projectApi.get(selectedProjectId),
    { enabled: Boolean(selectedProjectId), refetchInterval: 3000 }
  );

  const runMutation = useMutation((autoMode) => projectApi.run(selectedProjectId, autoMode), {
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", selectedProjectId], updated);
      queryClient.invalidateQueries("projects");
    }
  });

  const approveMutation = useMutation((agentKey) => projectApi.approve(selectedProjectId, agentKey), {
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", selectedProjectId], updated);
      queryClient.invalidateQueries("projects");
    }
  });

  const regenerateMutation = useMutation((agentKey) => projectApi.regenerate(selectedProjectId, agentKey), {
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", selectedProjectId], updated);
      queryClient.invalidateQueries("projects");
    }
  });

  if (isLoading && !project) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Loading venture workspace...
      </Card>
    );
  }

  if (isError || !project) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Project Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error?.response?.data?.message || "The requested project could not be found or does not belong to your account."}
        </p>
        <Button id="back-to-projects-error-btn" variant="secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Return to Projects
        </Button>
      </Card>
    );
  }

  const agentRuns = project.agentRuns || [];
  const activeReport = agentRuns.find((r) => r.key === activeReportKey);

  return (
    <div id="project-workspace-shell" className="space-y-6">
      {/* Workspace Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              id="back-to-dashboard-btn"
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="text-xs"
            >
              <ArrowLeft size={14} /> Back to Projects
            </Button>
            <Badge tone={project.status === "completed" ? "completed" : project.status === "failed" ? "failed" : project.status === "running" ? "running" : "pending"}>
              {project.status || "draft"}
            </Badge>
          </div>
          <h2 id="project-name-heading" className="text-3xl font-bold tracking-tight text-slate-900 pt-1">
            {project.startupName}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            id="run-next-agent-btn"
            variant="primary"
            size="sm"
            onClick={() => runMutation.mutate(false)}
            disabled={runMutation.isLoading}
            className="text-xs"
          >
            <Play size={14} />
            {runMutation.isLoading ? "Running..." : "Run Next Agent"}
          </Button>
          <Button
            id="run-auto-mode-btn"
            variant="secondary"
            size="sm"
            onClick={() => runMutation.mutate(true)}
            disabled={runMutation.isLoading}
            className="text-xs"
          >
            <RefreshCw size={14} className={runMutation.isLoading ? "animate-spin" : ""} />
            Auto Mode (Run All)
          </Button>
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-xs text-muted-foreground">
            <CalendarClock size={14} className="text-teal-700" />
            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "Recent"}
          </span>
        </div>
      </section>

      {/* Mutation Error Alert */}
      {runMutation.isError && (
        <div id="workflow-run-error" className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>Workflow Execution Note: {runMutation.error?.response?.data?.message || runMutation.error?.message || "Execution encountered an issue."}</span>
        </div>
      )}

      {/* Core Venture Specification Card */}
      <Card className="p-6 space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-700">Venture Concept & Idea</h3>
          <p id="project-idea-text" className="mt-2 text-slate-800 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
            {project.idea}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Project Metadata</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5"><Building2 size={14} className="text-slate-500" /> Industry</span>
              <p id="project-industry-val" className="font-semibold text-slate-800 text-sm">{project.industry}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} className="text-slate-500" /> Target Users</span>
              <p id="project-target-users-val" className="font-semibold text-slate-800 text-sm">{project.targetUsers}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5"><Globe size={14} className="text-slate-500" /> Country</span>
              <p id="project-country-val" className="font-semibold text-slate-800 text-sm">{project.country || "United States"}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5"><DollarSign size={14} className="text-slate-500" /> Target Budget</span>
              <p id="project-budget-val" className="font-semibold text-slate-800 text-sm">{project.budget || "Not specified"}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-slate-500" /> Timeline</span>
              <p id="project-timeline-val" className="font-semibold text-slate-800 text-sm">{project.timeline || "Not specified"}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck size={14} className="text-slate-500" /> Project Ownership</span>
              <p className="font-mono text-slate-800 text-xs truncate">Verified Founder Owner</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 11-Agent Pipeline Execution Status */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-teal-700" />
            <h3 className="text-lg font-bold text-slate-900">AI Venture Engine Pipeline</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              {agentRuns.filter((r) => r.status === "completed").length} / {agentRuns.length} Complete
            </span>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Sequential LangGraph multi-agent execution
          </p>
        </div>

        <div id="pipeline-agents-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agentRuns.map((agent, index) => (
            <Card key={agent.key} className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">
                    Step {index + 1}
                  </span>
                  <Badge tone={agent.status === "completed" ? "completed" : agent.status === "failed" ? "failed" : agent.status === "running" ? "running" : "pending"}>
                    {agent.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-sm text-slate-900">{agent.name}</h4>
                <p className="text-xs font-mono text-slate-400 truncate">{agent.outputFile}</p>

                {agent.error && (
                  <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded leading-snug">
                    {agent.error}
                  </p>
                )}

                {agent.runtimeMs > 0 && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>Runtime: {(agent.runtimeMs / 1000).toFixed(1)}s</span>
                    {agent.tokenUsage > 0 && <span>Tokens: {agent.tokenUsage}</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-2 flex flex-wrap gap-2 text-xs">
                {agent.report && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    onClick={() => setActiveReportKey(activeReportKey === agent.key ? null : agent.key)}
                  >
                    <FileText size={12} />
                    {activeReportKey === agent.key ? "Hide Report" : "View Report"}
                  </Button>
                )}
                {agent.status === "completed" && !agent.approved && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    onClick={() => approveMutation.mutate(agent.key)}
                    disabled={approveMutation.isLoading}
                  >
                    <CheckCircle2 size={12} />
                    Approve
                  </Button>
                )}
                {(agent.status === "completed" || agent.status === "failed") && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    onClick={() => regenerateMutation.mutate(agent.key)}
                    disabled={regenerateMutation.isLoading}
                  >
                    <RefreshCw size={12} className={regenerateMutation.isLoading ? "animate-spin" : ""} />
                    Regenerate
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Report Preview Panel */}
      {activeReport?.report && (
        <Card id="active-report-preview" className="p-6 space-y-3 bg-white">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">{activeReport.name}</h3>
              <p className="text-xs font-mono text-muted-foreground">{activeReport.outputFile}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => setActiveReportKey(null)}
            >
              Close
            </Button>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
            {activeReport.report}
          </pre>
        </Card>
      )}
    </div>
  );
}
