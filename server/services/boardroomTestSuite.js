import { inMemoryStore, isMemoryMode } from "./inMemoryStore.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import BoardroomSession from "../models/BoardroomSession.js";
import boardroomService from "./boardroomService.js";
import { signToken as generateAuthToken } from "../utils/authToken.js";
import { llmService } from "./llmService.js";

/**
 * Executes the complete Phase 6 Boardroom Verification Test Suite
 * Returns a comprehensive report object with PASS/FAIL metrics and detailed outputs.
 */
export async function runBoardroomTestSuite() {
  const results = {
    startedAt: new Date().toISOString(),
    tests: [],
    matrix: {},
    summary: { passed: 0, failed: 0, total: 0 }
  };

  function record(name, pass, details = {}) {
    results.tests.push({ name, status: pass ? "PASS" : "FAIL", details });
    results.matrix[name] = pass ? "PASS" : "FAIL";
    if (pass) results.summary.passed++;
    else results.summary.failed++;
  }

  console.log("[BoardroomTestSuite] Starting test suite execution...");

  let userA, userB, tokenA, tokenB, projectA, sessionA;

  // 1. SETUP TEST USERS
  try {
    const timestamp = Date.now();
    const userAData = {
      name: "Founder Alice",
      email: `alice_${timestamp}@ventureflow.io`,
      password: "Password123!"
    };
    const userBData = {
      name: "Founder Bob",
      email: `bob_${timestamp}@ventureflow.io`,
      password: "Password123!"
    };

    if (isMemoryMode()) {
      userA = await inMemoryStore.createUser(userAData);
      userB = await inMemoryStore.createUser(userBData);
    } else {
      userA = await User.create(userAData);
      userB = await User.create(userBData);
    }

    tokenA = generateAuthToken(userA);
    tokenB = generateAuthToken(userB);

    record("Phase 2 Auth Verification", Boolean(tokenA && tokenB), {
      userAId: userA.id || userA._id,
      userBId: userB.id || userB._id
    });
  } catch (err) {
    record("Phase 2 Auth Verification", false, { error: err.message });
  }

  // 2. SETUP TEST PROJECT (Phase 3 & Phase 4 grounding)
  try {
    const projectData = {
      user: userA.id || userA._id,
      userId: userA.id || userA._id,
      startupName: "FounderFlow AI",
      idea: "An AI-powered automated venture creation engine for solo founders and technical teams",
      industry: "AI SaaS / Venture Tech",
      targetUsers: "Technical founders, venture builders, startup accelerators",
      country: "India",
      budget: "$25,000",
      timeline: "6 months",
      status: "in_progress",
      agentRuns: [
        {
          key: "market",
          agentName: "Market Research Specialist",
          status: "completed",
          approved: true,
          outputFile: "market_report.md",
          reportContent: "# Market Analysis for FounderFlow AI\n\n- Indian market: rapidly growing developer base, lower initial CAC, but lower average ARPU ($15-$30/mo).\n- US market: high willingness to pay ($99-$299/mo), huge SaaS TAM, but 4x-5x higher acquisition costs and intense competition."
        },
        {
          key: "financial",
          agentName: "Financial Modeler",
          status: "completed",
          approved: true,
          outputFile: "financial_forecast.md",
          reportContent: "# Financial Outlook\n\n- Initial Budget: $25,000.\n- Runway: 6 months at ~$4,000/mo burn rate.\n- India launch runway: 9-12 months due to lower operational costs.\n- US launch runway: 4-6 months with paid ads burn."
        }
      ]
    };

    if (isMemoryMode()) {
      projectA = await inMemoryStore.createProject(projectData);
    } else {
      projectA = await Project.create(projectData);
    }

    record("Phase 3 Project Creation", Boolean(projectA && (projectA.id || projectA._id)), {
      projectId: projectA.id || projectA._id,
      startupName: projectA.startupName
    });

    record("Phase 4 Multi-Agent State Check", projectA.agentRuns?.length >= 2, {
      agentCount: projectA.agentRuns?.length
    });
  } catch (err) {
    record("Phase 3 Project Creation", false, { error: err.message });
    record("Phase 4 Multi-Agent State Check", false, { error: err.message });
  }

  // 3. SECURITY & CROSS-TENANT OWNERSHIP TEST
  try {
    const projectAId = String(projectA.id || projectA._id);
    const userBId = String(userB.id || userB._id);

    // User B tries to debate User A's project
    let crossTenantBlocked = false;
    try {
      await boardroomService.runExecutiveDebate({
        userId: userBId,
        projectId: projectAId,
        question: "Malicious access attempt"
      });
    } catch (err) {
      if (err.status === 404 || err.message?.includes("not found")) {
        crossTenantBlocked = true;
      }
    }

    // User B tries to list User A's sessions
    let listBlocked = false;
    try {
      await boardroomService.listSessions({
        userId: userBId,
        projectId: projectAId
      });
    } catch (err) {
      if (err.status === 404 || err.message?.includes("not found")) {
        listBlocked = true;
      }
    }

    record("Ownership & Cross-Tenant Security", crossTenantBlocked && listBlocked, {
      crossTenantDebateBlocked: crossTenantBlocked,
      crossTenantListBlocked: listBlocked
    });
  } catch (err) {
    record("Ownership & Cross-Tenant Security", false, { error: err.message });
  }

  // 4. VALIDATION HANDLING TEST
  try {
    const projectAId = String(projectA.id || projectA._id);
    const userAId = String(userA.id || userA._id);

    let emptyRejected = false;
    try {
      await boardroomService.runExecutiveDebate({
        userId: userAId,
        projectId: projectAId,
        question: "   "
      });
    } catch (err) {
      if (err.status === 400 || err.message?.includes("required")) {
        emptyRejected = true;
      }
    }

    let invalidProjectRejected = false;
    try {
      await boardroomService.runExecutiveDebate({
        userId: userAId,
        projectId: "65f000000000000000000000",
        question: "Valid question but non-existent project"
      });
    } catch (err) {
      if (err.status === 404 || err.message?.includes("not found")) {
        invalidProjectRejected = true;
      }
    }

    record("Validation & Error Handling", emptyRejected && invalidProjectRejected, {
      emptyQuestionRejected: emptyRejected,
      invalidProjectRejected: invalidProjectRejected
    });
  } catch (err) {
    record("Validation & Error Handling", false, { error: err.message });
  }

  // 5. REAL BOARDROOM EXECUTION WITH SECTION 32 TEST QUESTION
  const testQuestion =
    "Should FounderFlow AI launch in India first or target the US market first, considering our current budget, target users, product maturity, competitive landscape, and six-month timeline?";

  let debateResult = null;
  const timingBreakdown = {};

  try {
    const projectAId = String(projectA.id || projectA._id);
    const userAId = String(userA.id || userA._id);

    console.log("[BoardroomTestSuite] Executing Section 32 test question debate...");
    const debateStart = Date.now();

    debateResult = await boardroomService.runExecutiveDebate({
      userId: userAId,
      projectId: projectAId,
      question: testQuestion,
      sessionId: null
    });

    const totalDuration = Date.now() - debateStart;
    timingBreakdown.totalDurationMs = totalDuration;

    // Check each role response
    const roles = ["ceo", "cto", "cfo", "cmo", "vc"];
    const foundRoles = {};
    for (const r of roles) {
      const msg = debateResult.messages?.find((m) => m.role?.toLowerCase() === r.toLowerCase());
      foundRoles[r] = Boolean(msg && msg.content && msg.content.length > 50);
      record(`Role Perspective: ${r.toUpperCase()}`, foundRoles[r], {
        role: r,
        title: msg?.title || r.toUpperCase(),
        contentPreview: msg?.content ? msg.content.slice(0, 150) + "..." : null,
        length: msg?.content?.length || 0
      });
    }

    // Check consensus
    const consensusContent = typeof debateResult.consensus === "string"
      ? debateResult.consensus
      : (debateResult.consensus?.summary || JSON.stringify(debateResult.consensus));

    const hasConsensus = Boolean(consensusContent && consensusContent.length > 50);

    record("Consensus Synthesis", hasConsensus, {
      summaryPreview: consensusContent ? consensusContent.slice(0, 200) + "..." : null,
      length: consensusContent?.length || 0
    });

    record("Token & Runtime Tracking", Boolean(debateResult.runtimeMs > 0), {
      tokenUsage: debateResult.tokenUsage,
      runtimeMs: debateResult.runtimeMs,
      totalDurationMs: totalDuration
    });

    sessionA = debateResult;
  } catch (err) {
    console.error("[BoardroomTestSuite] Debate execution failed:", err);
    record("Boardroom Debate Execution", false, { error: err.message });
  }

  // 6. SESSION PERSISTENCE & RETRIEVAL TEST
  try {
    const projectAId = String(projectA.id || projectA._id);
    const userAId = String(userA.id || userA._id);
    const sessionId = String(sessionA?.sessionId || sessionA?._id || sessionA?.id);

    const sessions = await boardroomService.listSessions({
      userId: userAId,
      projectId: projectAId
    });

    const retrievedSession = await boardroomService.getSession({
      userId: userAId,
      sessionId
    });

    const isPersisted = Boolean(
      sessions.length > 0 &&
      retrievedSession &&
      String(retrievedSession.id || retrievedSession._id) === sessionId
    );

    record("Session Persistence & History", isPersisted, {
      sessionCount: sessions.length,
      retrievedSessionId: retrievedSession?.id || retrievedSession?._id,
      messagesCount: retrievedSession?.messages?.length
    });
  } catch (err) {
    record("Session Persistence & History", false, { error: err.message });
  }

  results.completedAt = new Date().toISOString();
  results.allPassed = results.summary.failed === 0;

  return {
    results,
    sampleDebate: debateResult ? {
      sessionId: debateResult.sessionId,
      question: debateResult.question,
      tokenUsage: debateResult.tokenUsage,
      runtimeMs: debateResult.runtimeMs,
      roles: debateResult.messages?.map((m) => ({
        role: m.role,
        title: m.title,
        content: m.content,
        recommendation: m.recommendation
      })),
      consensus: debateResult.consensus
    } : null
  };
}
