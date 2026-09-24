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

  const { data = [], isLoading, isError, error } = useQuery("projects", projectApi.list);

  const createProject = useMutation(projectApi.create, {
    onSuccess: (newProject) => {
      setSelectedProject(newProject);
      queryClient.invalidateQueries("projects");
      setForm(emptyIdea);
      if (onOpenStudio) {
        onOpenStudio(newProject);
      }
    }
  });

  const submit = (event) => {
    event.preventDefault();
    if (!form.startupName.trim() || !form.idea.trim() || !form.industry.trim() || !form.targetUsers.trim()) {
      return;
    }
    createProject.mutate({
      startupName: form.startupName.trim(),
      idea: form.idea.trim(),
      industry: form.industry.trim(),
      targetUsers: form.targetUsers.trim(),
      country: form.country?.trim() || "United States",
      budget: form.budget?.trim() || "",
      timeline: form.timeline?.trim() || ""
    });
  };

  const projectList = Array.isArray(data) ? data : [];

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
          <form id="create-project-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "startupName", id: "startup-name-input", label: "Startup Name *", required: true },
              { key: "industry", id: "industry-input", label: "Industry *", required: true },
              { key: "targetUsers", id: "target-users-input", label: "Target Users *", required: true },
              { key: "country", id: "country-input", label: "Country" },
              { key: "budget", id: "budget-input", label: "Budget", placeholder: "e.g. $50,000" },
              { key: "timeline", id: "timeline-input", label: "Timeline", placeholder: "e.g. 6 months" }
            ].map((f) => (
              <label key={f.key} className="block text-sm font-medium">
                {f.label}
                <input
                  id={f.id}
                  className="mt-1 h-10 w-full rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-teal-600"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </label>
            ))}
            <label className="block text-sm font-medium sm:col-span-2">
              Startup Idea *
              <textarea
                id="idea-input"
                className="mt-1 min-h-28 w-full rounded-md border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600"
                value={form.idea}
                onChange={(event) => setForm({ ...form, idea: event.target.value })}
                placeholder="Describe the startup value proposition, problem solved, and core innovation..."
                required
              />
            </label>
            {createProject.isError && (
              <p id="create-project-error" className="sm:col-span-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-md">
                {createProject.error?.response?.data?.message || createProject.error?.message || "Project creation failed. Please check fields and retry."}
              </p>
            )}
            <Button id="create-project-submit-btn" className="sm:col-span-2" disabled={createProject.isLoading}>
              <Plus size={17} />
              {createProject.isLoading ? "Creating venture..." : "Create project"}
            </Button>
          </form>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-bold">Projects</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search size={16} />
            <span id="projects-count">{projectList.length} total</span>
          </div>
        </div>
        <div id="projects-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading && (
            <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              Loading projects...
            </Card>
          )}
          {isError && (
            <Card className="p-8 text-center text-sm text-rose-600 md:col-span-2 xl:col-span-3">
              Failed to load projects: {error?.response?.data?.message || error?.message || "Server error"}
            </Card>
          )}
          {!isLoading && !isError && projectList.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No startup projects found. Submit your first venture concept using the form above to get started.
            </Card>
          )}
          {projectList.map((project) => (
            <Card key={project._id || project.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{project.startupName}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{project.industry}</p>
                  </div>
                  <Badge tone={project.status === "completed" ? "completed" : project.status === "failed" ? "failed" : project.status === "running" ? "running" : "pending"}>
                    {project.status || "draft"}
                  </Badge>
                </div>
                <p className="line-clamp-3 min-h-16 text-sm text-slate-600">{project.idea}</p>
              </div>
              <div>
                <div className="mt-5 flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles size={16} />
                    Score {project.startupScore?.overall || 0}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock size={16} />
                    {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "Just now"}
                  </span>
                </div>
                <Button
                  id={`open-project-${project._id || project.id}`}
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={() => {
                    setSelectedProject(project);
                    if (onOpenStudio) {
                      onOpenStudio(project);
                    }
                  }}
                >
                  Open studio
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
