import { FileText } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function ReportsPanel({ project }) {
  const completed = (project.agentRuns || []).filter((agent) => agent.report);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Generated reports</h3>
          <p className="text-sm text-muted-foreground">Markdown outputs from the agent chain.</p>
        </div>
        <Badge tone="completed">{completed.length} ready</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {completed.map((agent) => (
          <article key={agent.key} className="rounded-lg border border-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 font-semibold">
                <FileText size={17} />
                {agent.outputFile}
              </h4>
              <Badge tone={agent.approved ? "completed" : "running"}>{agent.approved ? "approved" : "needs review"}</Badge>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">{agent.report}</pre>
          </article>
        ))}
        {!completed.length && <p className="text-sm text-muted-foreground">Run the first agent to generate reports.</p>}
      </div>
    </Card>
  );
}
