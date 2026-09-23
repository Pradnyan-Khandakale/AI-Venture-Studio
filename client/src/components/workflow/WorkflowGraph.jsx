import ReactFlow, { Background, Controls, MiniMap } from "react-flow-renderer";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const colors = {
  pending: "#e2e8f0",
  running: "#f59e0b",
  completed: "#10b981",
  failed: "#e11d48"
};

function AgentNode({ data }) {
  return (
    <div className="min-w-52 rounded-lg border border-border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">{data.label}</strong>
        <Badge tone={data.status}>{data.status}</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{data.output || "Waiting for execution"}</p>
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export function WorkflowGraph({ agents }) {
  // TODO: Build the idea node plus one node per agent (staggered positions, with the
  // TODO: status and output file in data), then connect them in sequence using the status
  // TODO: colour and animating the edge while an agent is running.
  const nodes = [];
  const edges = [];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h3 className="text-lg font-bold">Agent workflow</h3>
        <p className="text-sm text-muted-foreground">Live states update as each specialist agent completes its report.</p>
      </div>
      <div className="h-[520px] bg-white">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <MiniMap />
          <Controls />
          <Background gap={22} />
        </ReactFlow>
      </div>
    </Card>
  );
}
