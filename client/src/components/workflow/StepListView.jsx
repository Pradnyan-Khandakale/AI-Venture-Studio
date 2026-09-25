import React from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  ChevronRight
} from "lucide-react";
import { Badge } from "../ui/Badge.jsx";

export function StepListView({ project, selectedAgentKey, onSelectAgent }) {
  const agentRuns = project?.agentRuns || [];

  return (
    <div className="space-y-2.5">
      {agentRuns.map((agent, index) => {
        const isSelected = selectedAgentKey === agent.key;
        const isRunning = agent.status === "running";
        const isFailed = agent.status === "failed";
        const isCompleted = agent.status === "completed";
        const isApproved = agent.approved === true;

        const borderStyle = isSelected
          ? "border-teal-600 ring-2 ring-teal-600/30 bg-teal-50/20"
          : isRunning
          ? "border-amber-400 bg-amber-50/40"
          : isFailed
          ? "border-rose-200 bg-rose-50/30"
          : isApproved
          ? "border-emerald-200 bg-emerald-50/20"
          : "border-slate-200 bg-white hover:border-slate-300";

        return (
          <button
            key={agent.key}
            type="button"
            onClick={() => onSelectAgent(agent.key)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-sm ${borderStyle}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs font-bold text-slate-400 w-6 text-center flex-shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{agent.name}</h4>
                  <Badge tone={isCompleted ? (isApproved ? "completed" : "running") : isFailed ? "failed" : isRunning ? "running" : "pending"}>
                    {isApproved ? "Approved" : isCompleted ? "Needs Review" : agent.status}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                  {agent.outputFile}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 text-slate-400">
              {isRunning && <RefreshCw size={14} className="animate-spin text-amber-600" />}
              {isApproved && <ShieldCheck size={16} className="text-emerald-600" />}
              {isCompleted && !isApproved && <CheckCircle2 size={16} className="text-blue-600" />}
              {isFailed && <AlertCircle size={16} className="text-rose-600" />}
              {agent.status === "pending" && <Clock size={15} className="text-slate-300" />}
              {agent.report && <FileText size={15} className="text-teal-600" />}
              <ChevronRight size={16} className={isSelected ? "text-teal-600" : "text-slate-300"} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default StepListView;
