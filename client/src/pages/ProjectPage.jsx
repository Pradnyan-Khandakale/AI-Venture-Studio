import { Check, Download, Mail, Play, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { HealthScore } from "../components/dashboard/HealthScore";
import { ReportsPanel } from "../components/reports/ReportsPanel";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { WorkflowGraph } from "../components/workflow/WorkflowGraph";
import { projectApi } from "../services/api";
import { useStudioStore } from "../store/useStudioStore";

export default function ProjectPage() {
  const selectedProject = useStudioStore((state) => state.selectedProject);
  const setSelectedProject = useStudioStore((state) => state.setSelectedProject);
  const queryClient = useQueryClient();
  const id = selectedProject?._id;

  // TODO: Poll the project with useQuery(["project", id], () => projectApi.get(id)) while a
  // TODO: project is selected and keep the store in sync through onSuccess.
  const project = selectedProject;

  const refreshProject = (updated) => {
    // TODO: Store the updated project and invalidate the ["project", id] and "projects" queries.
  };

  // TODO: Wire these to projectApi.run, approve, regenerate, and email, refreshing the
  // TODO: project after each successful call.
  const run = useMutation(() => Promise.resolve(null));
  const approve = useMutation(() => Promise.resolve(null));
  const regenerate = useMutation(() => Promise.resolve(null));
  const email = useMutation(() => Promise.resolve(null));

  if (!project) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold">No project selected</h2>
        <p className="mt-2 text-muted-foreground">Create or open a project from the dashboard.</p>
      </Card>
    );
  }

  const currentAgent = project.agentRuns?.find((agent) => agent.status === "completed" && !agent.approved);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Active venture</p>
          <h2 className="text-3xl font-bold">{project.startupName}</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">{project.idea}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run.mutate(false)} disabled={run.isLoading}>
            <Play size={17} />
            Run next
          </Button>
          <Button variant="secondary" onClick={() => run.mutate(true)} disabled={run.isLoading}>
            <RefreshCw size={17} />
            Auto mode
          </Button>
          <Button as="a" variant="secondary" onClick={() => window.open(projectApi.export(project._id, "pdf"), "_blank")}>
            <Download size={17} />
            PDF
          </Button>
          <Button variant="secondary" onClick={() => window.open(projectApi.export(project._id, "markdown"), "_blank")}>
            <Download size={17} />
            MD
          </Button>
          <Button variant="secondary" onClick={() => window.open(projectApi.export(project._id, "json"), "_blank")}>
            <Download size={17} />
            JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const address = window.prompt("Email address for the venture report");
              if (address) email.mutate(address);
            }}
            disabled={email.isLoading}
          >
            <Mail size={17} />
            Email
          </Button>
        </div>
      </section>

      {currentAgent && (
        <Card className="flex flex-col gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Approval needed: {currentAgent.name}</h3>
            <p className="text-sm text-amber-800">Approve the report to unlock the next agent, or regenerate it.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => approve.mutate(currentAgent.key)} disabled={approve.isLoading}>
              <Check size={17} />
              Approve
            </Button>
            <Button variant="secondary" onClick={() => regenerate.mutate(currentAgent.key)} disabled={regenerate.isLoading}>
              <RefreshCw size={17} />
              Regenerate
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <WorkflowGraph agents={project.agentRuns || []} />
        <HealthScore score={project.startupScore} />
      </div>
      <ReportsPanel project={project} />
    </div>
  );
}
