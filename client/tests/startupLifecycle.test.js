import test from "node:test";
import assert from "node:assert/strict";

// Minimal browser localStorage polyfill for Node test runner
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

const { STARTUP_STATES, useAppStore } = await import("../src/store/useAppStore.js");
const { useStudioStore } = await import("../src/store/useStudioStore.js");
const { resolveApiBaseUrl } = await import("../src/services/api.js");
const {
  initializeApplication,
  resetLifecycleForTests
} = await import("../src/services/backendLifecycle.js");

const TERMINAL_STATES = new Set([
  STARTUP_STATES.AUTHENTICATED,
  STARTUP_STATES.UNAUTHENTICATED,
  STARTUP_STATES.BACKEND_UNAVAILABLE,
  STARTUP_STATES.SESSION_ERROR
]);

function resetAll({ token = null, user = null } = {}) {
  storageMap.clear();
  if (token) storageMap.set("avs_token", token);
  if (user) storageMap.set("avs_user", JSON.stringify(user));
  resetLifecycleForTests();
  useAppStore.getState().resetForTests();
  useStudioStore.getState().restoreSession();
}

test("1. Backend immediately available, no token -> unauthenticated without calling /auth/me", async () => {
  resetAll();
  let healthCalls = 0;
  let meCalls = 0;

  const finalState = await initializeApplication({
    healthFetcher: async () => {
      healthCalls += 1;
      return { ok: true, ready: true, database: "mongodb" };
    },
    meFetcher: async () => {
      meCalls += 1;
      return { ok: true, user: { id: "u1", name: "Founder", email: "f@e.com" } };
    }
  });

  assert.equal(finalState, STARTUP_STATES.UNAUTHENTICATED);
  assert.equal(useAppStore.getState().startupState, STARTUP_STATES.UNAUTHENTICATED);
  assert.equal(healthCalls, 1);
  assert.equal(meCalls, 0);
});

test("2. Backend immediately available, valid token -> authenticated & user restored", async () => {
  resetAll({ token: "valid-token" });
  let healthCalls = 0;
  let meCalls = 0;

  const finalState = await initializeApplication({
    healthFetcher: async () => {
      healthCalls += 1;
      return { ok: true, ready: true, database: "mongodb" };
    },
    meFetcher: async () => {
      meCalls += 1;
      return { ok: true, user: { id: "u1", name: "Jane Founder", email: "jane@example.com" } };
    }
  });

  assert.equal(finalState, STARTUP_STATES.AUTHENTICATED);
  assert.equal(useAppStore.getState().startupState, STARTUP_STATES.AUTHENTICATED);
  assert.equal(useStudioStore.getState().auth.user.email, "jane@example.com");
  assert.equal(healthCalls, 1);
  assert.equal(meCalls, 1);
});

test("3. Backend immediately available, invalid token (401) -> clears token & unauthenticated", async () => {
  resetAll({ token: "bad-token", user: { id: "u1", name: "Old", email: "old@example.com" } });

  const finalState = await initializeApplication({
    healthFetcher: async () => ({ ok: true, ready: true, database: "mongodb" }),
    meFetcher: async () => {
      const err = new Error("Unauthorized");
      err.response = { status: 401, data: { message: "Invalid or expired authentication token" } };
      throw err;
    }
  });

  assert.equal(finalState, STARTUP_STATES.UNAUTHENTICATED);
  assert.equal(useAppStore.getState().startupState, STARTUP_STATES.UNAUTHENTICATED);
  assert.equal(localStorage.getItem("avs_token"), null);
  assert.equal(useStudioStore.getState().auth.token, null);
  assert.ok(useAppStore.getState().sessionMessage.includes("Invalid or expired"));
});

test("4. Render cold start -> wakes up across retries, preserves token, then authenticates", async () => {
  resetAll({ token: "cold-start-token" });
  let healthAttempts = 0;
  const observedStates = [];
  const unsub = useAppStore.subscribe((s) => observedStates.push(s.startupState));

  try {
    const finalState = await initializeApplication({
      maxWaitMs: 2000,
      retryIntervalsMs: [40, 40],
      wakingThresholdMs: 20,
      healthFetcher: async () => {
        healthAttempts += 1;
        if (healthAttempts < 3) {
          const err = new Error("Network Error");
          err.code = "ERR_NETWORK";
          throw err;
        }
        return { ok: true, ready: true, database: "mongodb" };
      },
      meFetcher: async () => ({
        ok: true,
        user: { id: "u1", name: "Founder", email: "founder@example.com" }
      })
    });

    assert.equal(finalState, STARTUP_STATES.AUTHENTICATED);
    assert.equal(healthAttempts, 3);
    assert.equal(localStorage.getItem("avs_token"), "cold-start-token");
    assert.ok(observedStates.includes(STARTUP_STATES.BACKEND_WAKING));
  } finally {
    unsub();
  }
});

test("5. Health endpoint timeout -> reaches backend_unavailable cleanly, preserves token", async () => {
  resetAll({ token: "preserved-token" });

  const finalState = await initializeApplication({
    maxWaitMs: 180,
    healthTimeoutMs: 60,
    retryIntervalsMs: [40],
    wakingThresholdMs: 20,
    healthFetcher: async () => {
      const err = new Error("timeout of 60ms exceeded");
      err.code = "ECONNABORTED";
      err.isTimeoutAbort = true;
      throw err;
    }
  });

  assert.equal(finalState, STARTUP_STATES.BACKEND_UNAVAILABLE);
  assert.equal(useAppStore.getState().startupState, STARTUP_STATES.BACKEND_UNAVAILABLE);
  assert.equal(localStorage.getItem("avs_token"), "preserved-token");
  assert.ok(useAppStore.getState().error);
});

test("6a. MongoDB unavailable, no token -> unauthenticated immediately (does not block login)", async () => {
  resetAll();
  let meCalls = 0;

  const finalState = await initializeApplication({
    healthFetcher: async () => ({
      ok: true,
      ready: false,
      database: "unavailable",
      databaseState: "disconnected"
    }),
    meFetcher: async () => {
      meCalls += 1;
      return {};
    }
  });

  assert.equal(finalState, STARTUP_STATES.UNAUTHENTICATED);
  assert.equal(useAppStore.getState().backendReachable, true);
  assert.equal(useAppStore.getState().databaseReady, false);
  assert.equal(meCalls, 0);
});

test("6b. MongoDB unavailable, valid saved token -> session_error & preserves token", async () => {
  resetAll({ token: "valid-token-db-down" });

  const finalState = await initializeApplication({
    dbConnectGraceMs: 0,
    healthFetcher: async () => ({
      ok: true,
      ready: false,
      database: "unavailable",
      databaseState: "disconnected"
    })
  });

  assert.equal(finalState, STARTUP_STATES.SESSION_ERROR);
  assert.equal(useAppStore.getState().startupState, STARTUP_STATES.SESSION_ERROR);
  assert.equal(localStorage.getItem("avs_token"), "valid-token-db-down");
  assert.ok(useAppStore.getState().error.toLowerCase().includes("database"));
});

test("7. /api/auth/me returns 401 -> clears expired token & transitions to unauthenticated", async () => {
  resetAll({ token: "expired-jwt" });

  const finalState = await initializeApplication({
    healthFetcher: async () => ({ ok: true, ready: true, database: "mongodb" }),
    meFetcher: async () => {
      const err = new Error("Expired");
      err.response = { status: 401, data: { code: "TOKEN_EXPIRED", message: "Your session has expired." } };
      throw err;
    }
  });

  assert.equal(finalState, STARTUP_STATES.UNAUTHENTICATED);
  assert.equal(localStorage.getItem("avs_token"), null);
});

test("8. /api/auth/me returns 503 -> preserves token & transitions to session_error", async () => {
  resetAll({ token: "valid-jwt-503" });

  const finalState = await initializeApplication({
    healthFetcher: async () => ({ ok: true, ready: true, database: "mongodb" }),
    meFetcher: async () => {
      const err = new Error("Service Unavailable");
      err.response = {
        status: 503,
        data: { code: "DATABASE_UNAVAILABLE", message: "Database temporarily unavailable" }
      };
      throw err;
    }
  });

  assert.equal(finalState, STARTUP_STATES.SESSION_ERROR);
  assert.equal(localStorage.getItem("avs_token"), "valid-jwt-503");
  assert.ok(useAppStore.getState().error.includes("Database temporarily unavailable"));
});

test("9. /api/auth/me times out -> preserves token & transitions to session_error", async () => {
  resetAll({ token: "valid-jwt-timeout" });

  const finalState = await initializeApplication({
    authTimeoutMs: 50,
    healthFetcher: async () => ({ ok: true, ready: true, database: "mongodb" }),
    meFetcher: async () => {
      const err = new Error("timeout");
      err.code = "ECONNABORTED";
      err.isTimeoutAbort = true;
      throw err;
    }
  });

  assert.equal(finalState, STARTUP_STATES.SESSION_ERROR);
  assert.equal(localStorage.getItem("avs_token"), "valid-jwt-timeout");
  assert.ok(useAppStore.getState().error.toLowerCase().includes("too long"));
});

test("10. Retry after temporary failure -> recovers cleanly to authenticated", async () => {
  resetAll({ token: "retry-token" });

  const first = await initializeApplication({
    maxWaitMs: 120,
    retryIntervalsMs: [40],
    healthFetcher: async () => {
      const err = new Error("Network Error");
      err.code = "ERR_NETWORK";
      throw err;
    }
  });
  assert.equal(first, STARTUP_STATES.BACKEND_UNAVAILABLE);
  assert.equal(localStorage.getItem("avs_token"), "retry-token");

  const second = await initializeApplication({
    force: true,
    healthFetcher: async () => ({ ok: true, ready: true, database: "mongodb" }),
    meFetcher: async () => ({ ok: true, user: { id: "u1", name: "Recovered", email: "r@e.com" } })
  });
  assert.equal(second, STARTUP_STATES.AUTHENTICATED);
  assert.equal(useAppStore.getState().startupState, STARTUP_STATES.AUTHENTICATED);
});

test("11. React StrictMode double initialization -> deduplicates health and /auth/me calls", async () => {
  resetAll({ token: "strict-mode-token" });
  let healthCalls = 0;
  let meCalls = 0;

  const opts = {
    healthFetcher: async () => {
      healthCalls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, ready: true, database: "mongodb" };
    },
    meFetcher: async () => {
      meCalls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, user: { id: "u1", name: "Strict", email: "strict@example.com" } };
    }
  };

  const [s1, s2] = await Promise.all([initializeApplication(opts), initializeApplication(opts)]);

  assert.equal(s1, STARTUP_STATES.AUTHENTICATED);
  assert.equal(s2, STARTUP_STATES.AUTHENTICATED);
  assert.equal(healthCalls, 1, "Health check must be deduplicated");
  assert.equal(meCalls, 1, "/api/auth/me must be deduplicated");
});

test("12. No infinite loading state -> non-transient/unexpected errors always reach terminal state", async () => {
  resetAll({ token: "invariant-token" });

  // Case A: Non-transient 403 CORS error
  const s403 = await initializeApplication({
    healthFetcher: async () => {
      const err = new Error("Forbidden");
      err.response = { status: 403, data: { message: "Origin not allowed by CORS" } };
      throw err;
    }
  });
  assert.ok(TERMINAL_STATES.has(s403), `Expected terminal state, got ${s403}`);
  assert.ok(TERMINAL_STATES.has(useAppStore.getState().startupState));
  assert.equal(s403, STARTUP_STATES.BACKEND_UNAVAILABLE);

  // Case B: Non-JSON config error (e.g. HTML from misconfigured Vercel URL)
  const sHtml = await initializeApplication({
    force: true,
    healthFetcher: async () => {
      const err = new Error("Unexpected non-JSON response");
      err.isConfigError = true;
      err.userMessage = "Unexpected non-JSON response from /api/health.";
      throw err;
    }
  });
  assert.ok(TERMINAL_STATES.has(sHtml));
  assert.equal(sHtml, STARTUP_STATES.BACKEND_UNAVAILABLE);
});

test("13. API base URL normalization & production localhost protection", () => {
  assert.equal(
    resolveApiBaseUrl({ PROD: true, VITE_API_URL: "https://ai-venture-studio-api.onrender.com" }),
    "https://ai-venture-studio-api.onrender.com/api"
  );
  assert.equal(
    resolveApiBaseUrl({ PROD: true, VITE_API_URL: "https://ai-venture-studio-api.onrender.com/api/" }),
    "https://ai-venture-studio-api.onrender.com/api"
  );
  assert.equal(
    resolveApiBaseUrl({ PROD: true, VITE_API_URL: "http://localhost:5000/api" }),
    ""
  );
  assert.equal(resolveApiBaseUrl({ PROD: false, VITE_API_URL: "" }), "/api");
});
