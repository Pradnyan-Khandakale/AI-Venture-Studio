import Project from "../models/Project.js";
import BoardroomSession from "../models/BoardroomSession.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";
import { projectService } from "./projectService.js";
import { agentDefinitions } from "../agents/agentDefinitions.js";

/**
 * Derives comprehensive venture analytics overview for an authenticated user.
 */
export async function getOverviewAnalytics(userId) {
  const uid = String(userId || "");

  let projects = [];
  let boardroomSessions = [];

  if (isMemoryMode()) {
    projects = memory.listProjects(uid);
    boardroomSessions = memory.boardroomSessions.filter((s) => String(s.user) === uid);
  } else {
    projects = await Project.find({ user: uid }).lean();
    boardroomSessions = await BoardroomSession.find({ user: uid }).lean();
  }

  // 1. Projects Breakdown
  const statusCounts = projects.reduce(
    (acc, p) => ((acc[p.status || "draft"] = (acc[p.status || "draft"] || 0) + 1), acc),
    { draft: 0, running: 0, completed: 0, failed: 0 }
  );

  // 2. Workflow & Agent Runs Aggregation
  let totalAgentRuns = 0;
  let completedAgents = 0;
  let pendingAgents = 0;
  let failedAgents = 0;
  let runningAgents = 0;
  let approvedReports = 0;

  let totalRuntimeMs = 0;
  let totalTokens = 0;
  let executedRunsCount = 0;

  // Agent usage tracker for each of the 11 agents
  const agentMap = new Map(
    agentDefinitions.map((d) => [
      d.key,
      { ...d, runs: 0, completed: 0, pending: 0, failed: 0, approved: 0, totalRuntimeMs: 0, totalTokens: 0 }
    ])
  );

  for (const p of projects) {
    for (const run of p.agentRuns || []) {
      totalAgentRuns++;

      const agentData = agentMap.get(run.key);

      if (run.status === "completed") {
        completedAgents++;
        if (agentData) agentData.completed++;
      } else if (run.status === "running") {
        runningAgents++;
      } else if (run.status === "failed") {
        failedAgents++;
        if (agentData) agentData.failed++;
      } else {
        pendingAgents++;
        if (agentData) agentData.pending++;
      }

      if (run.approved) {
        approvedReports++;
        if (agentData) agentData.approved++;
      }

      const rtime = Number(run.runtimeMs) || 0;
      const tokens = Number(run.tokenUsage) || 0;

      if (rtime > 0 || run.status === "completed") {
        executedRunsCount++;
        totalRuntimeMs += rtime;
        if (agentData) {
          agentData.runs++;
          agentData.totalRuntimeMs += rtime;
        }
      }

      if (tokens > 0) {
        totalTokens += tokens;
        if (agentData) agentData.totalTokens += tokens;
      }
    }
  }

  // Include boardroom tokens if applicable
  let totalBoardroomTokens = 0;
  for (const b of boardroomSessions) {
    totalBoardroomTokens += Number(b.tokenUsage) || 0;
  }
  const grandTotalTokens = totalTokens + totalBoardroomTokens;

  // 3. Averages & Rates
  const completionRate = totalAgentRuns > 0 ? Math.round((completedAgents / totalAgentRuns) * 100) : 0;
  const averageRuntimeMs = executedRunsCount > 0 ? Math.round(totalRuntimeMs / executedRunsCount) : 0;
  const totalRuntimeSeconds = Math.round(totalRuntimeMs / 1000);
  const averageRuntimeSeconds = Math.round(averageRuntimeMs / 1000);

  // 4. Startup Scores Aggregation
  let scoreSum = 0;
  let scoredProjectsCount = 0;
  const dimSums = {
    marketDemand: 0,
    competition: 0,
    revenuePotential: 0,
    technicalFeasibility: 0,
    executionComplexity: 0
  };

  for (const p of projects) {
    if (p.startupScore?.overall > 0) {
      scoredProjectsCount++;
      scoreSum += p.startupScore.overall;
      dimSums.marketDemand += p.startupScore.marketDemand || 0;
      dimSums.competition += p.startupScore.competition || 0;
      dimSums.revenuePotential += p.startupScore.revenuePotential || 0;
      dimSums.technicalFeasibility += p.startupScore.technicalFeasibility || 0;
      dimSums.executionComplexity += p.startupScore.executionComplexity || 0;
    }
  }

  const averageOverallScore = scoredProjectsCount > 0 ? Math.round(scoreSum / scoredProjectsCount) : 0;
  const averageDimensions = {
    marketDemand: scoredProjectsCount > 0 ? Math.round(dimSums.marketDemand / scoredProjectsCount) : 0,
    competition: scoredProjectsCount > 0 ? Math.round(dimSums.competition / scoredProjectsCount) : 0,
    revenuePotential: scoredProjectsCount > 0 ? Math.round(dimSums.revenuePotential / scoredProjectsCount) : 0,
    technicalFeasibility: scoredProjectsCount > 0 ? Math.round(dimSums.technicalFeasibility / scoredProjectsCount) : 0,
    executionComplexity: scoredProjectsCount > 0 ? Math.round(dimSums.executionComplexity / scoredProjectsCount) : 0
  };

  // 5. Per-agent breakdown array
  const agentUsage = Array.from(agentMap.values()).map((a) => ({
    ...a,
    avgRuntimeMs: a.runs > 0 ? Math.round(a.totalRuntimeMs / a.runs) : 0,
    avgRuntimeSeconds: a.runs > 0 ? Math.round(a.totalRuntimeMs / a.runs / 1000) : 0
  }));

  // Find most used agent
  let mostUsedAgent = "Market Research";
  let maxCompleted = -1;
  for (const a of agentUsage) {
    if (a.completed > maxCompleted) {
      maxCompleted = a.completed;
      mostUsedAgent = a.name.replace(" Agent", "");
    }
  }

  // 6. Recent Projects Activity
  const recentProjects = projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 6)
    .map((p) => {
      const runs = p.agentRuns || [];
      const completed = runs.filter((r) => r.status === "completed").length;
      return {
        id: String(p._id || p.id),
        startupName: p.startupName,
        industry: p.industry,
        status: p.status || "draft",
        overallScore: p.startupScore?.overall || 0,
        completedAgents: completed,
        totalAgents: runs.length || 11,
        progressPercent: runs.length > 0 ? Math.round((completed / runs.length) * 100) : 0,
        updatedAt: p.updatedAt || p.createdAt
      };
    });

  return {
    ok: true,
    projects: {
      total: projects.length,
      ...statusCounts
    },
    workflow: {
      totalAgentRuns,
      completedAgents,
      pendingAgents,
      failedAgents,
      runningAgents,
      completionRate
    },
    aiUsage: {
      totalRuns: executedRunsCount,
      totalRuntimeMs,
      totalRuntimeSeconds,
      averageRuntimeMs,
      averageRuntimeSeconds,
      agentTokens: totalTokens,
      boardroomTokens: totalBoardroomTokens,
      totalTokens: grandTotalTokens
    },
    reports: {
      totalGenerated: completedAgents,
      approved: approvedReports,
      pendingApproval: Math.max(0, completedAgents - approvedReports)
    },
    startupScores: {
      averageOverall: averageOverallScore,
      dimensions: averageDimensions,
      scoredProjectsCount
    },
    agentUsage,
    mostUsedAgent,
    recentProjects
  };
}

/**
 * Derives project-specific analytics for an authorized user.
 */
export async function getProjectAnalytics(projectId, userId) {
  const uid = String(userId || "");
  const pid = String(projectId || "");

  const project = await projectService.getProjectForUser(pid, uid);
  if (!project) {
    return null;
  }

  let boardroomSessions = [];
  if (isMemoryMode()) {
    boardroomSessions = memory.listBoardroomSessions(pid, uid);
  } else {
    boardroomSessions = await BoardroomSession.find({ project: pid, user: uid }).lean();
  }

  const runs = project.agentRuns || [];
  let completedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let runningCount = 0;
  let approvedCount = 0;
  let totalRuntimeMs = 0;
  let totalTokens = 0;
  let executedRunsCount = 0;

  const agentStats = runs.map((run) => {
    const rtime = Number(run.runtimeMs) || 0;
    const tokens = Number(run.tokenUsage) || 0;

    if (run.status === "completed") completedCount++;
    else if (run.status === "failed") failedCount++;
    else if (run.status === "running") runningCount++;
    else pendingCount++;

    if (run.approved) approvedCount++;
    if (rtime > 0 || run.status === "completed") {
      executedRunsCount++;
      totalRuntimeMs += rtime;
    }
    if (tokens > 0) totalTokens += tokens;

    return {
      key: run.key,
      name: run.name,
      outputFile: run.outputFile,
      status: run.status,
      approved: Boolean(run.approved),
      runtimeMs: rtime,
      runtimeSeconds: Number((rtime / 1000).toFixed(1)),
      tokenUsage: tokens,
      hasReport: Boolean(run.report && run.report.trim().length > 0),
      error: run.error || null
    };
  });

  const boardroomTokens = boardroomSessions.reduce((acc, s) => acc + (Number(s.tokenUsage) || 0), 0);

  const score = project.startupScore || {
    marketDemand: 0,
    competition: 0,
    revenuePotential: 0,
    technicalFeasibility: 0,
    executionComplexity: 0,
    overall: 0
  };

  const radarData = [
    { dimension: "Market Demand", score: score.marketDemand || 0, fullMark: 100 },
    { dimension: "Competition", score: score.competition || 0, fullMark: 100 },
    { dimension: "Revenue Potential", score: score.revenuePotential || 0, fullMark: 100 },
    { dimension: "Technical Feasibility", score: score.technicalFeasibility || 0, fullMark: 100 },
    { dimension: "Execution Complexity", score: score.executionComplexity || 0, fullMark: 100 }
  ];

  return {
    ok: true,
    project: {
      id: String(project._id || project.id),
      startupName: project.startupName,
      idea: project.idea,
      industry: project.industry,
      targetUsers: project.targetUsers,
      country: project.country || "Global",
      budget: project.budget || "",
      timeline: project.timeline || "",
      status: project.status || "draft",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    workflow: {
      totalAgents: runs.length || 11,
      completed: completedCount,
      pending: pendingCount,
      failed: failedCount,
      running: runningCount,
      progressPercent: runs.length > 0 ? Math.round((completedCount / runs.length) * 100) : 0
    },
    aiUsage: {
      totalRuns: executedRunsCount,
      totalRuntimeMs,
      totalRuntimeSeconds: Math.round(totalRuntimeMs / 1000),
      averageRuntimeMs: executedRunsCount > 0 ? Math.round(totalRuntimeMs / executedRunsCount) : 0,
      agentTokens: totalTokens,
      boardroomTokens,
      totalTokens: totalTokens + boardroomTokens
    },
    reports: {
      totalGenerated: completedCount,
      approved: approvedCount,
      pendingApproval: Math.max(0, completedCount - approvedCount)
    },
    startupScore: {
      overall: score.overall || 0,
      marketDemand: score.marketDemand || 0,
      competition: score.competition || 0,
      revenuePotential: score.revenuePotential || 0,
      technicalFeasibility: score.technicalFeasibility || 0,
      executionComplexity: score.executionComplexity || 0,
      radarData
    },
    agentStats,
    boardroom: {
      sessionsCount: boardroomSessions.length,
      totalDebateTokens: boardroomTokens
    }
  };
}

