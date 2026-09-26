import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { projectService } from "./services/projectService.js";
import { getOverviewAnalytics, getProjectAnalytics } from "./services/analyticsService.js";
import { isMemoryMode, memory } from "./services/inMemoryStore.js";
import Project from "./models/Project.js";

async function runAnalyticsDifferenceTest() {
  console.log("=== SECTION 31: ANALYTICS RUNS DIFFERENCE TEST ===");
  await connectDatabase();

  const userId = new mongoose.Types.ObjectId().toString();

  // Project A: 3 agents completed
  const projA = await projectService.createProject(userId, {
    startupName: "Project Alpha",
    idea: "Testing partial analytics execution",
    industry: "SaaS",
    targetUsers: "Founders"
  });

  // Project B: 11 agents completed
  const projB = await projectService.createProject(userId, {
    startupName: "Project Beta",
    idea: "Testing full analytics execution",
    industry: "Fintech",
    targetUsers: "CFOs"
  });

  const pidA = String(projA._id || projA.id);
  const pidB = String(projB._id || projB.id);

  // Complete 3 agents on Project A
  const pA = await projectService.getProjectForUser(pidA, userId);
  for (let i = 0; i < 3; i++) {
    pA.agentRuns[i].status = "completed";
    pA.agentRuns[i].report = `Report content for agent ${i + 1}`;
    pA.agentRuns[i].runtimeMs = 1500 * (i + 1); // 1500, 3000, 4500 -> sum = 9000ms
    pA.agentRuns[i].tokenUsage = 500 * (i + 1); // 500, 1000, 1500 -> sum = 3000 tokens
    pA.agentRuns[i].approved = i === 0; // 1 approved
  }
  pA.startupScore = {
    marketDemand: 60,
    competition: 55,
    revenuePotential: 62,
    technicalFeasibility: 70,
    executionComplexity: 65,
    overall: 62
  };
  await pA.save();

  // Complete all 11 agents on Project B
  const pB = await projectService.getProjectForUser(pidB, userId);
  for (let i = 0; i < 11; i++) {
    pB.agentRuns[i].status = "completed";
    pB.agentRuns[i].report = `Full Report content for agent ${i + 1}`;
    pB.agentRuns[i].runtimeMs = 2000; // 11 * 2000 = 22000ms
    pB.agentRuns[i].tokenUsage = 1000; // 11 * 1000 = 11000 tokens
    pB.agentRuns[i].approved = true; // all 11 approved
  }
  pB.status = "completed";
  pB.startupScore = {
    marketDemand: 90,
    competition: 85,
    revenuePotential: 88,
    technicalFeasibility: 92,
    executionComplexity: 86,
    overall: 88
  };
  await pB.save();

  // Fetch Project A analytics
  const analyticsA = await getProjectAnalytics(pidA, userId);
  console.log(`\nProject A analytics:`);
  console.log(`- Completed agents: ${analyticsA.workflow.completed} (Expected: 3)`);
  console.log(`- Progress percent: ${analyticsA.workflow.progressPercent}% (Expected: 27%)`);
  console.log(`- Runtime Ms: ${analyticsA.aiUsage.totalRuntimeMs}ms (Expected: 9000ms)`);
  console.log(`- Token Usage: ${analyticsA.aiUsage.totalTokens} (Expected: 3000)`);
  console.log(`- Approved reports: ${analyticsA.reports.approved} (Expected: 1)`);

  if (analyticsA.workflow.completed !== 3) {
    throw new Error(`Project A completed count mismatch: got ${analyticsA.workflow.completed}`);
  }
  if (analyticsA.workflow.progressPercent !== 27) {
    throw new Error(`Project A progress percent mismatch: got ${analyticsA.workflow.progressPercent}`);
  }
  if (analyticsA.aiUsage.totalRuntimeMs !== 9000) {
    throw new Error(`Project A runtime mismatch: got ${analyticsA.aiUsage.totalRuntimeMs}`);
  }
  if (analyticsA.aiUsage.totalTokens !== 3000) {
    throw new Error(`Project A token usage mismatch: got ${analyticsA.aiUsage.totalTokens}`);
  }

  // Fetch Project B analytics
  const analyticsB = await getProjectAnalytics(pidB, userId);
  console.log(`\nProject B analytics:`);
  console.log(`- Completed agents: ${analyticsB.workflow.completed} (Expected: 11)`);
  console.log(`- Progress percent: ${analyticsB.workflow.progressPercent}% (Expected: 100%)`);
  console.log(`- Runtime Ms: ${analyticsB.aiUsage.totalRuntimeMs}ms (Expected: 22000ms)`);
  console.log(`- Token Usage: ${analyticsB.aiUsage.totalTokens} (Expected: 11000)`);
  console.log(`- Approved reports: ${analyticsB.reports.approved} (Expected: 11)`);

  if (analyticsB.workflow.completed !== 11) {
    throw new Error(`Project B completed count mismatch: got ${analyticsB.workflow.completed}`);
  }
  if (analyticsB.workflow.progressPercent !== 100) {
    throw new Error(`Project B progress percent mismatch: got ${analyticsB.workflow.progressPercent}`);
  }
  if (analyticsB.aiUsage.totalRuntimeMs !== 22000) {
    throw new Error(`Project B runtime mismatch: got ${analyticsB.aiUsage.totalRuntimeMs}`);
  }
  if (analyticsB.aiUsage.totalTokens !== 11000) {
    throw new Error(`Project B token usage mismatch: got ${analyticsB.aiUsage.totalTokens}`);
  }

  // Fetch Workspace Overview
  const overview = await getOverviewAnalytics(userId);
  console.log(`\nWorkspace Overview:`);
  console.log(`- Total projects: ${overview.projects.total} (Expected: 2)`);
  console.log(`- Total scheduled runs: ${overview.workflow.totalAgentRuns} (Expected: 22)`);
  console.log(`- Total completed agents: ${overview.workflow.completedAgents} (Expected: 14)`);
  console.log(`- Overall completion rate: ${overview.workflow.completionRate}% (Expected: 64%)`);
  console.log(`- Total runtime: ${overview.aiUsage.totalRuntimeMs}ms (Expected: 31000ms)`);
  console.log(`- Total tokens: ${overview.aiUsage.totalTokens} (Expected: 14000)`);
  console.log(`- Average score: ${overview.startupScores.averageOverall} (Expected: 75)`);

  if (overview.workflow.completedAgents !== 14) {
    throw new Error(`Overview completed agents mismatch: got ${overview.workflow.completedAgents}`);
  }
  if (overview.aiUsage.totalTokens !== 14000) {
    throw new Error(`Overview tokens mismatch: got ${overview.aiUsage.totalTokens}`);
  }
  if (overview.aiUsage.totalRuntimeMs !== 31000) {
    throw new Error(`Overview runtime mismatch: got ${overview.aiUsage.totalRuntimeMs}`);
  }

  console.log("\n✓ SECTION 31 TEST PASSED: Analytics accurately distinguish between partial (3) and complete (11) ventures, with exact runtime and token aggregations!");
}

runAnalyticsDifferenceTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SECTION 31 TEST FAILED:", err);
    process.exit(1);
  });
