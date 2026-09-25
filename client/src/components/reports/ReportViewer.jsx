import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";

export function ReportViewer({
  agent,
  project,
  onApprove,
  onRegenerate,
  onSaveReport,
  isApproving,
  isRegenerating,
  isSaving
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditedContent(agent?.report || "");
    setIsEditing(false);
  }, [agent?.key, agent?.report]);

  if (!agent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
        <Sparkles size={36} className="text-slate-300 mb-2" />
        <h4 className="text-base font-bold text-slate-700">No Agent Selected</h4>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Select any agent node in the workflow graph or step list to inspect its deliverables, review reports, and manage approvals.
        </p>
      </div>
    );
  }

  const isCompleted = agent.status === "completed";
  const isFailed = agent.status === "failed";
  const isRunning = agent.status === "running";
  const isApproved = agent.approved === true;
  const hasReport = Boolean(agent.report && agent.report.trim());

  const handleCopy = () => {
    if (agent.report) {
      navigator.clipboard.writeText(agent.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (onSaveReport) {
      await onSaveReport(agent.key, editedContent);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5 bg-slate-50/50">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase font-bold text-teal-700">
              Agent Output Deliverable
            </span>
            <Badge tone={isCompleted ? (isApproved ? "completed" : "running") : isFailed ? "failed" : isRunning ? "running" : "pending"}>
              {isApproved ? "Approved" : isCompleted ? "Needs Review" : agent.status}
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
            <FileText size={18} className="text-teal-700 flex-shrink-0" />
            {agent.name}
          </h3>
          <p className="text-xs font-mono text-slate-500 truncate">{agent.outputFile}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {hasReport && !isEditing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
              title="Copy markdown to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}

          {hasReport && !isEditing && (
            <Button
              id="edit-report-btn"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs"
            >
              <Edit3 size={13} />
              Edit Report
            </Button>
          )}

          {isEditing && (
            <>
              <Button
                id="cancel-edit-btn"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditedContent(agent.report || "");
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="text-xs"
              >
                <X size={13} />
                Cancel
              </Button>
              <Button
                id="save-report-btn"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs bg-emerald-700 hover:bg-emerald-800"
              >
                <Save size={13} />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}

          {isCompleted && !isApproved && !isEditing && (
            <Button
              id="approve-agent-btn"
              variant="primary"
              size="sm"
              onClick={() => onApprove(agent.key)}
              disabled={isApproving}
              className="text-xs bg-teal-700 hover:bg-teal-800"
            >
              <CheckCircle2 size={13} />
              {isApproving ? "Approving..." : "Approve & Next"}
            </Button>
          )}

          {(isCompleted || isFailed) && !isEditing && (
            <Button
              id="regenerate-agent-btn"
              variant="secondary"
              size="sm"
              onClick={() => onRegenerate(agent.key)}
              disabled={isRegenerating}
              className="text-xs"
            >
              <RefreshCw size={13} className={isRegenerating ? "animate-spin" : ""} />
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </Button>
          )}
        </div>
      </div>

      {/* Failure Diagnostic Alert */}
      {isFailed && (
        <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold">Agent Generation Halted</strong>
            <p className="leading-relaxed">{agent.error || "The agent encountered an issue during execution."}</p>
            <p className="text-[11px] text-rose-600">
              You can retry generation using the &quot;Regenerate&quot; button once Ollama/services are accessible.
            </p>
          </div>
        </div>
      )}

      {/* Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            Runtime: {agent.runtimeMs > 0 ? `${(agent.runtimeMs / 1000).toFixed(1)}s` : "Pending"}
          </span>
          {agent.tokenUsage > 0 && <span>Tokens: {agent.tokenUsage}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isApproved && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck size={14} /> Founder Approved
            </span>
          )}
          {isEditing && (
            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Editing Draft Mode
            </span>
          )}
        </div>
      </div>

      {/* Report Content Body / Editor */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {isEditing ? (
          <div className="space-y-2 h-full flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Markdown Editor (Modifications will be saved to venture memory)</span>
              <span>{editedContent.length} characters</span>
            </div>
            <textarea
              id="report-editor-textarea"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full flex-1 min-h-[380px] p-4 text-xs font-mono bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-y"
              placeholder="Edit report content in Markdown format..."
            />
          </div>
        ) : hasReport ? (
          <div id="report-view-container" className="space-y-4 max-w-none">
            <pre className="bg-slate-950 text-slate-100 p-5 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto shadow-inner max-h-[500px]">
              {agent.report}
            </pre>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
            <FileText size={32} className="text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No report generated yet</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Execute this agent in manual mode or run Auto Mode to synthesize this deliverable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportViewer;
