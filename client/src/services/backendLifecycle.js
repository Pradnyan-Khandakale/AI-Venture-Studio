import { authApi, getApiErrorMessage, getHealth, isTransientError } from "./api.js";
import { useAppStore } from "../store/useAppStore.js";
import { useStudioStore } from "../store/useStudioStore.js";

const MAX_WAKE_DURATION_MS = 75000; // 75 seconds max wait for Render free-tier cold start
const RETRY_INTERVALS_MS = [2000, 3000, 4000, 5000];
const WAKING_NOTICE_THRESHOLD_MS = 1200;

let inFlightWakePromise = null;
let inFlightVerifyPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Probes GET /api/health with bounded retries to gracefully handle Render free-tier cold starts.
 * - Deduplicates concurrent calls (safe under React 18 StrictMode).
 * - Transitions to "waking" if the backend takes >1.2s or returns transient errors.
 * - Stops polling completely once the backend is ready or MAX_WAKE_DURATION_MS elapses.
 */
export function waitForBackendReady({ force = false } = {}) {
  const currentState = useAppStore.getState();

  if (!force && currentState.backendStatus === "ready") {
    return Promise.resolve(true);
  }

  if (inFlightWakePromise) {
    return inFlightWakePromise;
  }

  inFlightWakePromise = (async () => {
    const startTime = Date.now();
    let attempt = 0;

    useAppStore.getState().setChecking();

    // If the initial check takes longer than 1.2s, proactively show the wake-up notice
    const wakingTimer = setTimeout(() => {
      const status = useAppStore.getState().backendStatus;
      if (status === "checking") {
        useAppStore.getState().setWaking({
          attempt: Math.max(1, attempt),
          elapsedSeconds: Math.max(1, Math.floor((Date.now() - startTime) / 1000))
        });
      }
    }, WAKING_NOTICE_THRESHOLD_MS);

    try {
      while (true) {
        attempt += 1;
        const elapsedMs = Date.now() - startTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (attempt > 1) {
          useAppStore.getState().setWaking({ attempt, elapsedSeconds });
        }

        try {
          const data = await getHealth();
          if (data?.ok && data?.ready !== false) {
            useAppStore.getState().setHealthData(data);
            return true;
          }

          // Backend HTTP server is up, but database is still connecting
          useAppStore.getState().setWaking({
            attempt,
            elapsedSeconds: Math.floor((Date.now() - startTime) / 1000)
          });
        } catch (error) {
          // Stop immediately on non-transient configuration/CORS/4xx failures
          if (!isTransientError(error)) {
            useAppStore.getState().setHealthError(getApiErrorMessage(error));
            return false;
          }

          useAppStore.getState().setWaking({
            attempt,
            elapsedSeconds: Math.floor((Date.now() - startTime) / 1000)
          });
        }

        const totalElapsed = Date.now() - startTime;
        if (totalElapsed >= MAX_WAKE_DURATION_MS) {
          useAppStore
            .getState()
            .setHealthError(
              "The server did not respond in time. On Render's free tier, waking from sleep can occasionally take over a minute. Click Retry Connection to try again."
            );
          return false;
        }

        const waitMs = RETRY_INTERVALS_MS[Math.min(attempt - 1, RETRY_INTERVALS_MS.length - 1)];
        const remainingMs = Math.max(250, MAX_WAKE_DURATION_MS - totalElapsed);
        await sleep(Math.min(waitMs, remainingMs));
      }
    } finally {
      clearTimeout(wakingTimer);
      inFlightWakePromise = null;
    }
  })();

  return inFlightWakePromise;
}

/**
 * Verifies a stored JWT via GET /api/auth/me once per bootstrap cycle.
 * - Deduplicates concurrent calls (prevents duplicate /auth/me requests in StrictMode).
 * - Never clears a valid token on transient network/503 errors; only HTTP 401 clears auth.
 */
export function verifyStoredSession({ force = false } = {}) {
  const token = localStorage.getItem("avs_token");
  if (!token || token === "null" || token === "undefined") {
    useStudioStore.getState().setAuthStatus("unauthenticated", null);
    return Promise.resolve(false);
  }

  const studio = useStudioStore.getState();
  if (!force && studio.authStatus === "authenticated" && studio.auth?.user) {
    return Promise.resolve(true);
  }

  if (inFlightVerifyPromise) {
    return inFlightVerifyPromise;
  }

  inFlightVerifyPromise = (async () => {
    useStudioStore.getState().setAuthStatus("verifying", null);

    try {
      const data = await authApi.me();
      if (data?.user) {
        useStudioStore.getState().setAuth({ token, user: data.user });
        return true;
      }

      // Unexpected empty response without 401: preserve token, surface recoverable state
      useStudioStore
        .getState()
        .setAuthStatus("error", "Unable to confirm your session right now. Please retry.");
      return false;
    } catch (error) {
      // 401 is already handled by the Axios interceptor (clears token & sets sessionMessage)
      if (error?.response?.status === 401) {
        return false;
      }

      // Transient network / 503 / timeout error: preserve token! Do NOT log the user out.
      useStudioStore.getState().setAuthStatus("error", getApiErrorMessage(error));
      return false;
    } finally {
      inFlightVerifyPromise = null;
    }
  })();

  return inFlightVerifyPromise;
}

/**
 * Full startup sequence: wake/verify backend readiness, then restore & verify auth if a token exists.
 */
export async function initializeApplication({ force = false } = {}) {
  const ready = await waitForBackendReady({ force });
  if (!ready) {
    return false;
  }

  const token = localStorage.getItem("avs_token");
  if (token && token !== "null" && token !== "undefined") {
    return verifyStoredSession({ force });
  }

  useStudioStore.getState().setAuthStatus("unauthenticated", null);
  return true;
}
