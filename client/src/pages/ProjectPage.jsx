import React from "react";
import { ArrowLeft, CalendarClock, Layers, ShieldCheck, Building2, Users, Globe, DollarSign, Clock } from "lucide-react";
import { useQuery } from "react-query";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { projectApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

export default function ProjectPage({ onBack }) {
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);

  const { data: project, isLoading, isError, error } = useQuery(
    ["project", selectedProjectId],
    () => projectApi.get(selectedProjectId),
    { enabled: Boolean(selectedProjectId) }
  );

  if (isLoading) {
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
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <CalendarClock size={14} className="text-teal-700" />
            Last updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "Recent"}
          </span>
        </div>
      </section>

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

      {/* Phase 4 AI Venture Workflow Placeholder Shell */}
      <Card className="p-6 space-y-3 border-dashed border-teal-200 bg-teal-50/30">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-teal-700" />
          <h3 className="text-base font-bold text-slate-900">AI Venture Engine Pipeline (Phase 4)</h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            Phase Boundary
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          In Phase 4, the 11 specialist AI agents (Market Research, Competitor Analysis, Opportunity Discovery, Product Strategy, PRD, Architecture, Revenue Modeling, Financials, GTM, Investor Readiness, and Pitch Deck) will sequentially execute to produce investor-grade venture blueprints.
        </p>
        <p className="text-xs text-muted-foreground">
          Agent orchestration, React Flow graphs, human approvals, boardroom debate, and report exports are scheduled for subsequent phases.
        </p>
      </Card>
    </div>
  );
}
