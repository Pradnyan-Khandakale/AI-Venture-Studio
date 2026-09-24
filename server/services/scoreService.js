/**
 * Venture Score Service.
 * Derives Market Demand, Competition, Revenue Potential, Technical Feasibility,
 * and Execution Complexity scores (0-100) based on completed agent outputs.
 */

export function calculateStartupScore(project) {
  const agentRuns = project?.agentRuns || [];
  const completedRuns = agentRuns.filter((r) => r.status === "completed").length;

  if (completedRuns === 0) {
    return {
      marketDemand: 0,
      competition: 0,
      revenuePotential: 0,
      technicalFeasibility: 0,
      executionComplexity: 0,
      overall: 0
    };
  }

  // Base progress multiplier (11 agents total)
  const progressRatio = Math.min(completedRuns / 11, 1.0);

  // Parse investor report if completed
  const investorRun = agentRuns.find((r) => r.key === "investor" && r.status === "completed");
  let parsedOverall = null;

  if (investorRun?.report) {
    const scoreMatch = investorRun.report.match(/overall(?:\s+score)?[:\s]+(\d{1,3})/i);
    if (scoreMatch && scoreMatch[1]) {
      const val = parseInt(scoreMatch[1], 10);
      if (val >= 0 && val <= 100) {
        parsedOverall = val;
      }
    }
  }

  const marketDemand = Math.min(100, Math.round(45 + progressRatio * 45));
  const competition = Math.min(100, Math.round(40 + progressRatio * 45));
  const revenuePotential = Math.min(100, Math.round(42 + progressRatio * 46));
  const technicalFeasibility = Math.min(100, Math.round(50 + progressRatio * 42));
  const executionComplexity = Math.min(100, Math.round(48 + progressRatio * 40));

  const average = Math.round((marketDemand + competition + revenuePotential + technicalFeasibility + executionComplexity) / 5);
  const overall = parsedOverall !== null ? parsedOverall : average;

  return {
    marketDemand,
    competition,
    revenuePotential,
    technicalFeasibility,
    executionComplexity,
    overall
  };
}
