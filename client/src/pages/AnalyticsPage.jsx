import React, { useState } from "react";
import {
  Activity,
  Clock,
  Coins,
  ListChecks,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useQuery } from "react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell
} from "recharts";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { analyticsApi, projectApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

const BAR_COLORS = [
  "#0f766e", // teal-700
  "#0d9488", // teal-600
  "#14b8a6", // teal-500
  "#059669", // emerald-600
  "#10b981", // emerald-500
  "#0284c7", // sky-600
  "#2563eb", // blue-600
  "#4f46e5", // indigo-600
  "#7c3aed", // violet-600
  "#9333ea", // purple-600
  "#c026d3"  // fuchsia-600
];

export default function AnalyticsPage({ onOpenStudio }) {
  const { selectedProjectId } = useStudioStore();
  const [activeScope, setActiveScope] = useState(selectedProjectId || "overview");

  // Fetch list of user's projects for project selector
  const { data: projects = [] } = useQuery("projects", projectApi.list);

  // Fetch overview analytics
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview
  } = useQuery("analytics-overview", analyticsApi.overview, {
    staleTime: 30000
  });

  // Fetch project-specific analytics if a specific project is selected
  const isProjectScoped = activeScope !== "overview";
  const {
    data: projectData,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject
  } = useQuery(
    ["analytics-project", activeScope],
    () => analyticsApi.getProjectAnalytics(activeScope),
    {
      enabled: isProjectScoped,
      staleTime: 30000
    }
  );

  const isLoading = isProjectScoped ? isProjectLoading : isOverviewLoading;
  const isError = isProjectScoped ? isProjectError : isOverviewError;
  const errorObj = isProjectScoped ? projectError : overviewError;

  // Selected venture details if project-scoped
  const currentProject = projects.find((p) => String(p._id || p.id) === String(activeScope));

  // Determine cards data
  const cards = isProjectScoped
    ? [
        {
          label: "Workflow Completion",
          value: `${projectData?.workflow?.progressPercent || 0}%`,
          sub: `${projectData?.workflow?.completed || 0} of ${projectData?.workflow?.totalAgents || 11} agents`,
          icon: ListChecks,
          tone: "teal"
        },
        {
          label: "Total Runtime",
          value: `${projectData?.aiUsage?.totalRuntimeSeconds || 0}s`,
          sub: `Avg: ${Math.round((projectData?.aiUsage?.averageRuntimeMs || 0) / 100) / 10}s per agent`,
          icon: Clock,
          tone: "indigo"
        },
        {
          label: "AI Token Usage",
          value: (projectData?.aiUsage?.totalTokens || 0).toLocaleString(),
          sub: `${(projectData?.aiUsage?.agentTokens || 0).toLocaleString()} agent / ${(projectData?.aiUsage?.boardroomTokens || 0).toLocaleString()} boardroom`,
          icon: Coins,
          tone: "emerald"
        },
        {
          label: "Startup Health Score",
          value: `${projectData?.startupScore?.overall || 0}/100`,
          sub: projectData?.startupScore?.overall >= 70 ? "Investor Ready" : "In Development",
          icon: Sparkles,
          tone: "amber"
        }
      ]
    : [
        {
          label: "Total Ventures",
          value: overviewData?.projects?.total || 0,
          sub: `${overviewData?.projects?.completed || 0} completed, ${overviewData?.projects?.running || 0} running, ${overviewData?.projects?.draft || 0} draft`,
          icon: Building2,
          tone: "teal"
        },
        {
          label: "Workflow Completion Rate",
          value: `${overviewData?.workflow?.completionRate || 0}%`,
          sub: `${overviewData?.workflow?.completedAgents || 0} completed of ${overviewData?.workflow?.totalAgentRuns || 0} scheduled runs`,
          icon: ListChecks,
          tone: "indigo"
        },
        {
          label: "Total AI Generation Runtime",
          value: `${overviewData?.aiUsage?.totalRuntimeSeconds || 0}s`,
          sub: `Avg: ${Math.round((overviewData?.aiUsage?.averageRuntimeMs || 0) / 100) / 10}s per run across ${overviewData?.aiUsage?.totalRuns || 0} executions`,
          icon: Clock,
          tone: "emerald"
        },
        {
          label: "Total Tokens Consumed",
          value: (overviewData?.aiUsage?.totalTokens || 0).toLocaleString(),
          sub: `${(overviewData?.aiUsage?.agentTokens || 0).toLocaleString()} workflow / ${(overviewData?.aiUsage?.boardroomTokens || 0).toLocaleString()} boardroom`,
          icon: Coins,
          tone: "purple"
        }
      ];

  // Runtime chart data
  const runtimeChartData = isProjectScoped
    ? (projectData?.agentStats || [])
        .filter((a) => a.runtimeMs > 0 || a.status === "completed")
        .map((a) => ({
          name: a.name.replace(" Agent", ""),
          runtimeSeconds: a.runtimeSeconds || Number((a.runtimeMs / 1000).toFixed(1)),
          key: a.key
        }))
    : (overviewData?.agentUsage || []).map((a) => ({
        name: a.name.replace(" Agent", ""),
        runtimeSeconds: Math.round(a.totalRuntimeMs / 1000),
        runs: a.runs,
        key: a.key
      }));

  // Token usage chart data
  const tokenChartData = isProjectScoped
    ? (projectData?.agentStats || [])
        .filter((a) => a.tokenUsage > 0)
        .map((a) => ({
          name: a.name.replace(" Agent", ""),
          tokenUsage: a.tokenUsage
        }))
    : (overviewData?.agentUsage || []).map((a) => ({
        name: a.name.replace(" Agent", ""),
        tokenUsage: a.totalTokens
      }));

  // Radar chart data for startup score
  const radarChartData = isProjectScoped
    ? projectData?.startupScore?.radarData || []
    : [
        {
          dimension: "Market Demand",
          score: overviewData?.startupScores?.dimensions?.marketDemand || 0,
          fullMark: 100
        },
        {
          dimension: "Competition",
          score: overviewData?.startupScores?.dimensions?.competition || 0,
          fullMark: 100
        },
        {
          dimension: "Revenue Potential",
          score: overviewData?.startupScores?.dimensions?.revenuePotential || 0,
          fullMark: 100
        },
        {
          dimension: "Technical Feasibility",
          score: overviewData?.startupScores?.dimensions?.technicalFeasibility || 0,
          fullMark: 100
        },
        {
          dimension: "Execution Complexity",
          score: overviewData?.startupScores?.dimensions?.executionComplexity || 0,
          fullMark: 100
        }
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Analytics Header & Scope Switcher */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <TrendingUp size={14} /> Operations & Intelligence
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {isProjectScoped && currentProject ? `${currentProject.startupName} Analytics` : "Venture Studio Analytics"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            {isProjectScoped
              ? "Live workflow execution metrics, agent runtimes, token usage, and readiness scoring for this venture."
              : "Consolidated operational intelligence across all founder projects, agent runs, and token consumption."}
          </p>
        </div>

        {/* Scope Dropdown */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
          <Filter size={14} className="text-slate-500 ml-2" />
          <span className="font-semibold text-slate-700">Scope:</span>
          <select
            id="analytics-scope-select"
            value={activeScope}
            onChange={(e) => setActiveScope(e.target.value)}
            className="border-0 bg-transparent text-slate-900 font-semibold focus:outline-none focus:ring-0 pr-6 py-1 cursor-pointer"
          >
            <option value="overview">All Ventures (Overview)</option>
            <optgroup label="Select Specific Venture">
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.startupName}
                </option>
              ))}
            </optgroup>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (isProjectScoped ? refetchProject() : refetchOverview())}
            title="Refresh analytics data"
            className="p-1 text-slate-500 hover:text-slate-800"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </section>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="p-8 text-center text-sm text-rose-600 bg-rose-50/50 border-rose-200">
          Failed to load analytics: {errorObj?.response?.data?.message || errorObj?.message || "Server error"}
        </Card>
      )}

      {!isLoading && !isError && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label} className="p-5 flex flex-col justify-between shadow-sm bg-white">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500 tracking-wide">{c.label}</span>
                      <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
                        <Icon size={16} />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{c.value}</p>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">{c.sub}</p>
                </Card>
              );
            })}
          </div>

          {/* Charts Row: Runtimes & Health Radar */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left Chart: Agent Runtime Analysis */}
            <Card className="p-5 lg:col-span-7 shadow-sm space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={16} className="text-teal-700" />
                    Agent Runtime Breakdown (Seconds)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isProjectScoped
                      ? "Execution duration per specialist AI agent in this venture"
                      : "Cumulative runtime distribution across workflow stages"}
                  </p>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                {runtimeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={runtimeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderRadius: "8px",
                          border: "none",
                          color: "#f8fafc",
                          fontSize: "12px"
                        }}
                        formatter={(val) => [`${val}s`, "Duration"]}
                      />
                      <Bar dataKey="runtimeSeconds" radius={[4, 4, 0, 0]}>
                        {runtimeChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No executed agent runtimes recorded yet. Run an agent in Studio to collect runtime metrics.
                  </div>
                )}
              </div>
            </Card>

            {/* Right Chart: Startup Readiness Health Radar */}
            <Card className="p-5 lg:col-span-5 shadow-sm space-y-4 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  Venture Readiness Radar
                </h3>
                <p className="text-xs text-slate-500">
                  {isProjectScoped
                    ? `5-dimension startup health score (${projectData?.startupScore?.overall || 0}/100)`
                    : `Average readiness across ${overviewData?.startupScores?.scoredProjectsCount || 0} scored ventures`}
                </p>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#475569" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar
                      name="Readiness Score"
                      dataKey="score"
                      stroke="#0f766e"
                      fill="#14b8a6"
                      fillOpacity={0.4}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "8px",
                        border: "none",
                        color: "#f8fafc",
                        fontSize: "12px"
                      }}
                      formatter={(val) => [`${val}/100`, "Score"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tokens Row & Breakdown Table */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Token Usage by Agent */}
            <Card className="p-5 lg:col-span-6 shadow-sm space-y-4 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Coins size={16} className="text-purple-600" />
                  AI Token Consumption by Agent
                </h3>
                <p className="text-xs text-slate-500">
                  Total prompt & completion tokens consumed across each deliverable pipeline
                </p>
              </div>

              <div className="h-64 w-full">
                {tokenChartData.some((t) => t.tokenUsage > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tokenChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderRadius: "8px",
                          border: "none",
                          color: "#f8fafc",
                          fontSize: "12px"
                        }}
                        formatter={(val) => [val.toLocaleString(), "Tokens"]}
                      />
                      <Bar dataKey="tokenUsage" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No token usage data logged yet.
                  </div>
                )}
              </div>
            </Card>

            {/* Agent / Activity Summary Table */}
            <Card className="p-5 lg:col-span-6 shadow-sm space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity size={16} className="text-teal-700" />
                    {isProjectScoped ? "Specialist Agent Execution Status" : "Recent Venture Activity"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isProjectScoped
                      ? "Status and approval review of each pipeline stage"
                      : "Recent venture projects and progress"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                {isProjectScoped ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="pb-2">Agent</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Runtime</th>
                        <th className="pb-2">Tokens</th>
                        <th className="pb-2">Approval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(projectData?.agentStats || []).map((agent) => (
                        <tr key={agent.key} className="hover:bg-slate-50/50">
                          <td className="py-2 font-medium text-slate-800">{agent.name}</td>
                          <td className="py-2">
                            <Badge tone={agent.status === "completed" ? "completed" : agent.status === "failed" ? "failed" : agent.status === "running" ? "running" : "pending"}>
                              {agent.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-slate-500 font-mono">{agent.runtimeSeconds}s</td>
                          <td className="py-2 text-slate-500 font-mono">{agent.tokenUsage || "—"}</td>
                          <td className="py-2">
                            {agent.approved ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={12} /> Approved
                              </span>
                            ) : agent.status === "completed" ? (
                              <span className="text-amber-600 font-medium">Pending Review</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-2.5">
                    {(overviewData?.recentProjects || []).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-teal-200 transition-all text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.startupName}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.industry} • Score: {p.overallScore}/100
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {p.completedAgents}/{p.totalAgents} Agents
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setActiveScope(p.id);
                            }}
                            className="text-[11px] px-2 py-1"
                          >
                            Inspect
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(overviewData?.recentProjects || []).length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No ventures found.</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
