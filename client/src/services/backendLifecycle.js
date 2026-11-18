import {
  API_BASE_URL,
  authApi,
  getApiErrorMessage,
  getHealth,
  isTransientError
} from "./api.js";
import { STARTUP_STATES, useAppStore } from "../store/useAppStore.js";
import { getStoredToken, useStudioStore } from "../store/useStudioStore.js";

const DEFAULT_MAX_WAKE_DURATION_MS = 45000;
const DEFAULT_HEALTH_TIMEOUT_MS = 8000;
const DEFAULT_AUTH_TIMEOUT_MS = 10000;
const DEFAULT_RETRY_INTERVALS_MS = [2000, 3000, 4000, 5000];
const DEFAULT_WAKING_NOTICE_THRESHOLD_MS = 1200;

const TERMINAL_STATES = new Set([
  STARTUP_STATES.AUTHENTICATED,
  STARTUP_STATES.UNAUTHENTICATED,
  STARTUP_STATES.BACKEND_UNAVAILABLE,
  STARTUP_STATES.SESSION_ERROR
]);

let inFlightWakePromise = null;
let inFlightVerifyPromise = null;
let inFlightInitPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStartup(event, details = {}) {
  const safeParts = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`);
  console.info(`[Startup] ${event}${safeParts.length ? ` (${safeParts.join(", ")})` : ""}`);
}

/**
 * Probes GET /api/health with strict per-request timeouts and a bounded total retry duration.
 *
 * Guarantees:
 * - Deduplicates simultaneous calls (safe under React 18 StrictMode).
 * - Checks Express liveness (/api/health); does NOT block on MongoDB readiness so login can load.
 * - Always resolves to { reachable, databaseReady, health, error } and updates startupState.
 */
export function waitForBackendReady(options = {}) {
  const {
    force = false,
    maxWaitMs = DEFAULT_MAX_WAKE_DURATION_MS,
    healthTimeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
    retryIntervalsMs = DEFAULT_RETRY_INTERVALS_MS,
    wakingThresholdMs = DEFAULT_WAKING_NOTICE_THRESHOLD_MS,
    healthFetcher = getHealth
  } = options;

  const current = useAppStore.getState();
  if (!force && current.backendReachable && current.healthData?.ok) {
    return Promise.resolve({
      reachable: true,
      databaseReady: current.databaseReady !== false,
      health: current.healthData,
      error: null
    });
  }

  if (inFlightWakePromise) {
    return inFlightWakePromise;
  }

  inFlightWakePromise = (async () => {
    const startTime = Date.now();
    let attempt = 0;

    logStartup("Health check started", { apiBase: API_BASE_URL || "(unconfigured)", maxWaitMs });

    useAppStore.getState().setStartupState(STARTUP_STATES.CHECKING_BACKEND, {
      attempt: 1,
      elapsedSeconds: 0,
      error: null
    });

    // Live 1-second elapsed timer so UI always reflects active progress
    const elapsedInterval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      useAppStore.getState().setElapsedSeconds(elapsedSec);
    }, 1000);

    // Transition to backend_waking if the first check takes longer than wakingThresholdMs
    const wakingTimer = setTimeout(() => {
      const st = useAppStore.getState().startupState;
      if (st === STARTUP_STATES.CHECKING_BACKEND) {
        useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_WAKING, {
          attempt: Math.max(1, attempt),
          elapsedSeconds: Math.max(1, Math.floor((Date.now() - startTime) / 1000)),
          error: null
        });
      }
    }, wakingThresholdMs);

    try {
      while (true) {
        attempt += 1;
        const elapsedMs = Date.now() - startTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (attempt > 1) {
          useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_WAKING, {
            attempt,
            elapsedSeconds,
            error: null
          });
        }

        const remainingBeforeCall = maxWaitMs - elapsedMs;
        if (attempt > 1 && remainingBeforeCall <= 0) {
          const timeoutMsg =
            "The backend server did not respond in time. On Render's free tier, waking from sleep can take up to a minute. Click Retry to try again.";
          logStartup("Health check failed (max wait reached)", { attempt, elapsedSeconds });
          useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_UNAVAILABLE, {
            backendReachable: false,
            databaseReady: false,
            elapsedSeconds,
            error: timeoutMsg
          });
          return { reachable: false, databaseReady: false, health: null, error: timeoutMsg };
        }

        const effectiveTimeout = Math.max(
          50,
          Math.min(healthTimeoutMs, Math.max(50, remainingBeforeCall))
        );

        try {
          const data = await healthFetcher({ timeout: effectiveTimeout });
          if (data?.ok === true) {
            const dbReady = data.ready !== false;
            logStartup("Health check succeeded", {
              attempt,
              elapsedMs: Date.now() - startTime,
              database: data.database || "unknown",
              databaseReady: dbReady
            });
            useAppStore.getState().setHealthData(data);
            return {
              reachable: true,
              databaseReady: dbReady,
              health: data,
              error: null
            };
          }

          // Server returned JSON with ok: false — treat as waking/unavailable
          const msg = data?.message || "Backend reported an unhealthy status.";
          logStartup("Health check returned non-ok payload", { attempt, message: msg });
        } catch (error) {
          const msg = getApiErrorMessage(error);
          if (!isTransientError(error)) {
            logStartup("Health check failed (non-transient)", {
              attempt,
              status: error?.response?.status || "config_error",
              message: msg
            });
            useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_UNAVAILABLE, {
              backendReachable: false,
              databaseReady: false,
              elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
              error: msg
            });
            return { reachable: false, databaseReady: false, health: null, error: msg };
          }

          logStartup("Health check transient failure; will retry if within limit", {
            attempt,
            elapsedMs: Date.now() - startTime,
            code: error?.code || error?.response?.status || "network"
          });
          useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_WAKING, {
            attempt,
            elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
            error: null
          });
        }

        const totalElapsed = Date.now() - startTime;
        if (totalElapsed >= maxWaitMs) {
          const timeoutMsg =
            "The backend server did not respond in time. On Render's free tier, waking from sleep can take up to a minute. Click Retry to try again.";
          logStartup("Health check failed (timeout window exhausted)", {
            attempt,
            elapsedSeconds: Math.floor(totalElapsed / 1000)
          });
          useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_UNAVAILABLE, {
            backendReachable: false,
            databaseReady: false,
            elapsedSeconds: Math.floor(totalElapsed / 1000),
            error: timeoutMsg
          });
          return { reachable: false, databaseReady: false, health: null, error: timeoutMsg };
        }

        const waitMs = retryIntervalsMs[Math.min(attempt - 1, retryIntervalsMs.length - 1)];
        const remainingMs = Math.max(50, maxWaitMs - totalElapsed);
        await sleep(Math.min(waitMs, remainingMs));
      }
    } catch (unexpectedError) {
      const msg = getApiErrorMessage(unexpectedError, "Unexpected error checking server health.");
      logStartup("Health check unexpected error", { message: msg });
      useAppStore.getState().setStartupState(STARTUP_STATES.BACKEND_UNAVAILABLE, {
        backendReachable: false,
        databaseReady: false,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
        error: msg
      });
      return { reachable: false, databaseReady: false, health: null, error: msg };
    } finally {
      clearTimeout(wakingTimer);
      clearInterval(elapsedInterval);
      inFlightWakePromise = null;
    }
  })();

  return inFlightWakePromise;
}

/**
 * Verifies a stored JWT via a single GET /api/auth/me request with a strict timeout.
 *
 * Guarantees:
 * - Deduplicated (never fires duplicate /auth/me requests).
 * - Only clears the saved token when the server explicitly responds HTTP 401.
 * - Preserves the token and transitions to "session_error" on 503, timeout, or network failure.
 */
export function verifyStoredSession(options = {}) {
  const {
    force = false,
    authTimeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
    meFetcher = authApi.me
  } = options;

  const token = getStoredToken();
  if (!token) {
    useAppStore.getState().setStartupState(STARTUP_STATES.UNAUTHENTICATED, { error: null });
    return Promise.resolve({ state: STARTUP_STATES.UNAUTHENTICATED });
  }

  const appState = useAppStore.getState();
  const studio = useStudioStore.getState();
  if (!force && appState.startupState === STARTUP_STATES.AUTHENTICATED && studio.auth?.user) {
    return Promise.resolve({ state: STARTUP_STATES.AUTHENTICATED });
  }

  if (inFlightVerifyPromise) {
    return inFlightVerifyPromise;
  }

  inFlightVerifyPromise = (async () => {
    logStartup("Session restoration started", { endpoint: "/api/auth/me", timeoutMs: authTimeoutMs });
    useAppStore.getState().setStartupState(STARTUP_STATES.CHECKING_SESSION, { error: null });

    try {
      const data = await meFetcher({ timeout: authTimeoutMs });
      if (data?.user) {
        useStudioStore.getState().setAuth({ token, user: data.user });
        useAppStore.getState().clearSessionMessage();
        useAppStore.getState().setStartupState(STARTUP_STATES.AUTHENTICATED, {
          backendReachable: true,
          databaseReady: true,
          error: null
        });
        logStartup("Session restoration succeeded", { finalState: STARTUP_STATES.AUTHENTICATED });
        return { state: STARTUP_STATES.AUTHENTICATED };
      }

      const emptyMsg = "The server returned an incomplete session response. Your session was preserved — please retry.";
      useAppStore.getState().setStartupState(STARTUP_STATES.SESSION_ERROR, { error: emptyMsg });
      logStartup("Session restoration failed (empty payload)", { finalState: STARTUP_STATES.SESSION_ERROR });
      return { state: STARTUP_STATES.SESSION_ERROR, error: emptyMsg };
    } catch (error) {
      const status = error?.response?.status;

      // Explicitly confirmed invalid/expired token -> clear token and show login page
      if (status === 401) {
        useStudioStore.getState().logout();
        const expiredMsg =
          error.response?.data?.message || "Your session has expired. Please sign in again.";
        useAppStore.getState().setSessionMessage(expiredMsg);
        useAppStore.getState().setStartupState(STARTUP_STATES.UNAUTHENTICATED, { error: null });
        logStartup("Session restoration rejected (401); token cleared", {
          finalState: STARTUP_STATES.UNAUTHENTICATED
        });
        return { state: STARTUP_STATES.UNAUTHENTICATED };
      }

      // 503 (MongoDB unavailable), timeout, or network failure -> PRESERVE token, recoverable error!
      const msg =
        status === 503
          ? error.response?.data?.message ||
            "The server is online, but the database is temporarily unavailable. Your session has been preserved — please retry."
          : getApiErrorMessage(
              error,
              "Unable to verify your session right now. Your session has been preserved — please retry."
            );

      useAppStore.getState().setStartupState(STARTUP_STATES.SESSION_ERROR, {
        databaseReady: status === 503 ? false : useAppStore.getState().databaseReady,
        error: msg
      });
      logStartup("Session restoration failed (token preserved)", {
        status: status || error?.code || "network",
        finalState: STARTUP_STATES.SESSION_ERROR
      });
      return { state: STARTUP_STATES.SESSION_ERROR, error: msg };
    } finally {
      inFlightVerifyPromise = null;
    }
  })();

  return inFlightVerifyPromise;
}

/**
 * Finite-state startup orchestrator.
 *
 * Guarantees:
 * - Always settles to a terminal state: authenticated | unauthenticated | backend_unavailable | session_error.
 * - Never leaves the application stuck in checking_backend, backend_waking, or checking_session.
 * - Deduplicates concurrent calls (React StrictMode safe).
 */
export function initializeApplication(options = {}) {
  const { force = false } = options;

  if (!force && inFlightInitPromise) {
    return inFlightInitPromise;
  }

  inFlightInitPromise = (async () => {
    const hasToken = Boolean(getStoredToken());
    logStartup("Startup began", { hasStoredToken: hasToken, force });

    try {
      const healthResult = await waitForBackendReady(options);

      // Backend completely unreachable after bounded retries or non-transient error
      if (!healthResult.reachable) {
        logStartup("Startup finished", { finalState: STARTUP_STATES.BACKEND_UNAVAILABLE });
        return STARTUP_STATES.BACKEND_UNAVAILABLE;
      }

      // Case A: No saved token -> NEVER call /api/auth/me; show login page immediately
      // (Does not require MongoDB readiness to display login interface)
      if (!getStoredToken()) {
        useAppStore.getState().setStartupState(STARTUP_STATES.UNAUTHENTICATED, { error: null });
        logStartup("Startup finished (no saved token)", {
          finalState: STARTUP_STATES.UNAUTHENTICATED,
          databaseReady: healthResult.databaseReady
        });
        return STARTUP_STATES.UNAUTHENTICATED;
      }

      // Case B: Saved token exists, Express is alive, but MongoDB is currently unavailable or still connecting.
      // If MongoDB is actively connecting during a fresh boot, allow a short bounded grace wait;
      // otherwise transition immediately to recoverable session_error (preserving token!).
      if (healthResult.databaseReady === false) {
        let dbReadyNow = false;
        const dbGraceMs = options.dbConnectGraceMs ?? 6000;
        const healthFetcher = options.healthFetcher || getHealth;

        if (healthResult.health?.databaseState === "connecting" && dbGraceMs > 0) {
          const graceStart = Date.now();
          while (Date.now() - graceStart < dbGraceMs) {
            await sleep(Math.min(1500, Math.max(50, dbGraceMs - (Date.now() - graceStart))));
            try {
              const probe = await healthFetcher({
                timeout: Math.min(options.healthTimeoutMs || DEFAULT_HEALTH_TIMEOUT_MS, 3000)
              });
              if (probe?.ok) {
                useAppStore.getState().setHealthData(probe);
                if (probe.ready !== false) {
                  dbReadyNow = true;
                  break;
                }
                if (probe.databaseState !== "connecting") {
                  break;
                }
              }
            } catch {
              break;
            }
          }
        }

        if (!dbReadyNow) {
          const dbMsg =
            "The backend server is online, but the database is temporarily unavailable. Your session has been preserved — please retry shortly or continue to login.";
          useAppStore.getState().setStartupState(STARTUP_STATES.SESSION_ERROR, {
            backendReachable: true,
            databaseReady: false,
            error: dbMsg
          });
          logStartup("Startup finished (database unavailable; token preserved)", {
            finalState: STARTUP_STATES.SESSION_ERROR
          });
          return STARTUP_STATES.SESSION_ERROR;
        }
      }

      // Case C: Saved token exists & backend + DB are ready -> verify via GET /api/auth/me once
      const sessionResult = await verifyStoredSession(options);
      logStartup("Startup finished", { finalState: sessionResult.state });
      return sessionResult.state;
    } catch (unexpectedError) {
      const msg = getApiErrorMessage(unexpectedError, "Startup failed unexpectedly. Please retry.");
      const fallbackState = useAppStore.getState().backendReachable
        ? STARTUP_STATES.SESSION_ERROR
        : STARTUP_STATES.BACKEND_UNAVAILABLE;
      useAppStore.getState().setStartupState(fallbackState, { error: msg });
      logStartup("Startup caught unexpected exception", { finalState: fallbackState, message: msg });
      return fallbackState;
    } finally {
      // HARD INVARIANT: Never leave the UI in a non-terminal loading state once startup finishes
      const finalState = useAppStore.getState().startupState;
      if (!TERMINAL_STATES.has(finalState)) {
        const fallback = useAppStore.getState().backendReachable
          ? STARTUP_STATES.SESSION_ERROR
          : STARTUP_STATES.BACKEND_UNAVAILABLE;
        useAppStore.getState().setStartupState(fallback, {
          error: useAppStore.getState().error || "Startup did not complete cleanly. Please retry."
        });
        logStartup("Startup invariant safeguard triggered", { from: finalState, to: fallback });
      }
      inFlightInitPromise = null;
    }
  })();

  return inFlightInitPromise;
}

export function resetLifecycleForTests() {
  inFlightWakePromise = null;
  inFlightVerifyPromise = null;
  inFlightInitPromise = null;
}
