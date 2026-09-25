import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType
} from "react-flow-renderer";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Lightbulb
} from "lucide-react";

/**
 * Custom React Flow node representing the initial Venture Idea.
 */
function IdeaNode({ data }) {
  return (
    <div className="w-64 rounded-xl border-2 border-teal-500 bg-teal-50/70 p-3.5 shadow-sm text-left font-sans">
      <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
        <Lightbulb size={16} className="text-teal-700" />
        <span>Venture Foundation</span>
      </div>
      <h4 className="mt-1 text-sm font-bold text-slate-900 truncate">{data.startupName}</h4>
      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{data.idea}</p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-teal-600 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}

/**
 * Custom React Flow node representing an individual AI specialist agent.
 */
function AgentNode({ data }) {
  const {
    step,
    name,
    outputFile,
    status,
    approved,
    runtimeMs,
    isSelected,
    error,
    hasReport
  } = data;

  const isRunning = status === "running";
  const isFailed = status === "failed";
  const isApproved = approved === true;
  const isCompleted = status === "completed";
  const isPending = status === "pending";
  const needsReview = isCompleted && !isApproved;

  // Dynamic styling based on agent state
  const borderTone = isRunning
    ? "border-amber-400 bg-amber-50/70 shadow-amber-200 ring-2 ring-amber-400/50"
    : isFailed
    ? "border-rose-300 bg-rose-50/60 shadow-rose-100"
    : isApproved
    ? "border-emerald-300 bg-emerald-50/50 shadow-emerald-50"
    : needsReview
    ? "border-blue-400 bg-blue-50/60 shadow-blue-100 ring-1 ring-blue-300"
    : "border-slate-200 bg-white hover:border-slate-300";

  const selectionRing = isSelected ? "ring-2 ring-teal-600 shadow-md" : "";

  return (
    <div
      className={`w-64 rounded-xl border p-3.5 transition-all text-left font-sans cursor-pointer ${borderTone} ${selectionRing}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
          Step {String(step).padStart(2, "0")}
        </span>

        {/* State Badge */}
        {isRunning && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <RefreshCw size={10} className="animate-spin text-amber-700" />
            Running
          </span>
        )}
        {isApproved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <ShieldCheck size={11} className="text-emerald-700" />
            Approved
          </span>
        )}
        {needsReview && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            <CheckCircle2 size={11} className="text-blue-700" />
            Review
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            <AlertCircle size={11} className="text-rose-700" />
            Failed
          </span>
        )}
        {isPending && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            <Clock size={10} className="text-slate-400" />
            Pending
          </span>
        )}
      </div>

      {/* Agent Title & Output filename */}
      <div className="mt-1.5">
        <h4 className="text-sm font-bold text-slate-900 leading-tight">{name}</h4>
        <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{outputFile}</p>
      </div>

      {/* Error or Metadata footer */}
      {isFailed && error && (
        <p className="mt-2 text-[10px] text-rose-700 bg-rose-100/70 p-1.5 rounded truncate">
          {error}
        </p>
      )}

      {(hasReport || runtimeMs > 0) && (
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            {hasReport && <FileText size={11} className="text-teal-700" />}
            {hasReport ? "Report Ready" : "No report"}
          </span>
          {runtimeMs > 0 && <span>{(runtimeMs / 1000).toFixed(1)}s</span>}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-teal-600 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}

const nodeTypes = {
  ideaNode: IdeaNode,
  agentNode: AgentNode
};

/**
 * Main Workflow Graph visualizer using React Flow.
 */
export function WorkflowGraph({ project, selectedAgentKey, onSelectAgent }) {
  const agentRuns = project?.agentRuns || [];

  const { nodes, edges } = useMemo(() => {
    const n = [];
    const e = [];

    // 1. Initial Idea node at top
    n.push({
      id: "node-idea",
      type: "ideaNode",
      position: { x: 260, y: 20 },
      data: {
        startupName: project?.startupName || "Venture Concept",
        idea: project?.idea || "Initializing venture..."
      }
    });

    let prevNodeId = "node-idea";

    // 2. Build 11 sequential agent nodes
    agentRuns.forEach((agent, index) => {
      const nodeId = `node-${agent.key}`;
      const yPos = 140 + index * 135;

      n.push({
        id: nodeId,
        type: "agentNode",
        position: { x: 260, y: yPos },
        data: {
          step: index + 1,
          key: agent.key,
          name: agent.name,
          outputFile: agent.outputFile,
          status: agent.status,
          approved: agent.approved,
          runtimeMs: agent.runtimeMs,
          error: agent.error,
          hasReport: Boolean(agent.report),
          isSelected: selectedAgentKey === agent.key
        }
      });

      // Connect previous node to current node
      const isSourceCompleted = index === 0 ? true : agentRuns[index - 1]?.status === "completed";
      const isTargetRunning = agent.status === "running";
      const isTargetCompleted = agent.status === "completed";
      const isTargetFailed = agent.status === "failed";

      let strokeColor = "#94a3b8"; // default slate
      if (isTargetRunning) strokeColor = "#f59e0b"; // amber pulse
      else if (isTargetCompleted) strokeColor = "#10b981"; // emerald
      else if (isTargetFailed) strokeColor = "#ef4444"; // rose

      e.push({
        id: `e-${prevNodeId}-${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        animated: isTargetRunning,
        style: {
          stroke: strokeColor,
          strokeWidth: isTargetRunning ? 2.5 : 2,
          strokeDasharray: isTargetCompleted || isTargetRunning ? undefined : "5,5"
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14
        }
      });

      prevNodeId = nodeId;
    });

    return { nodes: n, edges: e };
  }, [project, agentRuns, selectedAgentKey]);

  const handleNodeClick = (_event, node) => {
    if (node.type === "agentNode" && node.data?.key) {
      onSelectAgent(node.data.key);
    }
  };

  return (
    <div className="relative h-[650px] w-full rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} className="!bg-white !border !border-slate-200 !shadow-sm !rounded-lg" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "ideaNode") return "#0d9488";
            const status = n.data?.status;
            if (status === "completed") return "#10b981";
            if (status === "running") return "#f59e0b";
            if (status === "failed") return "#ef4444";
            return "#cbd5e1";
          }}
          className="!bg-white/90 !border !border-slate-200 !rounded-lg !shadow-sm"
          maskColor="rgba(241, 245, 249, 0.6)"
        />
      </ReactFlow>

      {/* Floating Canvas Legend */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-lg px-3 py-2 text-[11px] shadow-sm flex items-center gap-3 text-slate-600 pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Needs Review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Running
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" /> Pending
        </span>
      </div>
    </div>
  );
}

export default WorkflowGraph;
