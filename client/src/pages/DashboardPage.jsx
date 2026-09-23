import { CalendarClock, Plus, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { projectApi } from "../services/api";
import { useStudioStore } from "../store/useStudioStore";

const emptyIdea = {
  startupName: "",
  idea: "",
  industry: "",
  targetUsers: "",
  country: "United States",
  budget: "",
  timeline: ""
};

export default function DashboardPage({ onOpenStudio }) {
  const [form, setForm] = useState(emptyIdea);
  const queryClient = useQueryClient();
  const setSelectedProject = useStudioStore((state) => state.setSelectedProject);
  // TODO: Load the project list with useQuery("projects", projectApi.list).
  const data = [];
  const isLoading = false;

  // TODO: Create the project with useMutation(projectApi.create) and, on success, select
  // TODO: it, invalidate the "projects" query, reset the form, and open the studio tab.
  const createProject = useMutation(() => Promise.resolve(null));

  const submit = (event) => {
    event.preventDefault();
    // TODO: Submit the new project through the mutation above.
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="py-2">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Venture command center</p>
          <h2 className="text-4xl font-bold tracking-tight">Create, run, approve, and export startup blueprints.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Submit a venture concept and the local agent workflow will produce market analysis, product strategy, architecture, financials, GTM, readiness scoring, and a pitch deck.
          </p>
        </div>
        <Card className="p-5">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Startup Name" value={form.startupName} onChange={(value) => setForm({ ...form, startupName: value })} required />
            <Input label="Industry" value={form.industry} onChange={(value) => setForm({ ...form, industry: value })} required />
            <Input label="Target Users" value={form.targetUsers} onChange={(value) => setForm({ ...form, targetUsers: value })} required />
            <Input label="Country" value={form.country} onChange={(value) => setForm({ ...form, country: value })} />
            <Input label="Budget" value={form.budget} onChange={(value) => setForm({ ...form, budget: value })} />
            <Input label="Timeline" value={form.timeline} onChange={(value) => setForm({ ...form, timeline: value })} />
            <label className="block text-sm font-medium sm:col-span-2">
              Startup Idea
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600"
                value={form.idea}
                onChange={(event) => setForm({ ...form, idea: event.target.value })}
                required
              />
            </label>
            {createProject.isError && (
              <p className="sm:col-span-2 text-sm font-medium text-rose-600">
                {createProject.error?.response?.data?.message || "Project creation failed. Please sign in again and retry."}
              </p>
            )}
            <Button className="sm:col-span-2" disabled={createProject.isLoading}>
              <Plus size={17} />
              {createProject.isLoading ? "Creating..." : "Create project"}
            </Button>
          </form>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-bold">Projects</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search size={16} />
            {data.length} total
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading && <Card className="p-5 text-sm text-muted-foreground">Loading projects...</Card>}
          {data.map((project) => (
            <Card key={project._id} className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold">{project.startupName}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{project.industry}</p>
                </div>
                <Badge tone={project.status === "completed" ? "completed" : project.status === "failed" ? "failed" : "running"}>
                  {project.status}
                </Badge>
              </div>
              <p className="line-clamp-3 min-h-16 text-sm text-slate-600">{project.idea}</p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles size={16} />
                  Score {project.startupScore?.overall || 0}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock size={16} />
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <Button
                className="mt-4 w-full"
                variant="secondary"
                onClick={() => {
                  setSelectedProject(project);
                  onOpenStudio();
                }}
              >
                Open studio
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-teal-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}
