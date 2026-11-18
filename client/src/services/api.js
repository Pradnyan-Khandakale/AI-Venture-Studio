import axios from "axios";
import { STARTUP_STATES, useAppStore } from "../store/useAppStore.js";
import { getStoredToken, useStudioStore } from "../store/useStudioStore.js";

const DEFAULT_TIMEOUT_MS = 20000;
const HEALTH_TIMEOUT_MS = 8000;
const AUTH_ME_TIMEOUT_MS = 10000;
const EXPORT_TIMEOUT_MS = 60000;
const AI_EXECUTION_TIMEOUT_MS = 120000;
const MAX_SAFE_GET_RETRIES = 2;

const TRANSIENT_HTTP_STATUSES = new Set([502, 503, 504]);

function getEnv() {
  try {
    return (typeof import.meta !== "undefined" && import.meta.env) || {};
  } catch {
    return {};
  }
}

function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url);
}

export function resolveApiBaseUrl(envOverride) {
  const env = envOverride || getEnv();
  const isProd = Boolean(env.PROD);
  const raw = String(env.VITE_API_URL || "").trim().replace(/^['"]|['"]$/g, "");

  if (!raw) {
    if (isProd) {
      const warning =
        "Production API URL (VITE_API_URL) is not configured. Set VITE_API_URL in Vercel Environment Variables to your Render backend URL (e.g. https://<service>.onrender.com/api).";
      console.error(`[API Config] ${warning}`);
      useAppStore.getState().setApiConfigWarning(warning);
    }
    return "/api";
  }

  const trimmed = raw.replace(/\/+$/, "");

  if (isProd && isLocalhostUrl(trimmed)) {
    const warning =
      "Production VITE_API_URL points to localhost. Update VITE_API_URL in Vercel to your Render HTTPS backend URL.";
    console.error(`[API Config] ${warning}`);
    useAppStore.getState().setApiConfigWarning(warning);
    return "";
  }

  // Ensure full HTTP(S) URLs include the /api prefix if omitted (e.g. https://service.onrender.com)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.replace(/\/+$/, "");
      if (!pathname || pathname === "") {
        return `${trimmed}/api`;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function isTransientError(error) {
  if (!error) return false;
  if (error.isConfigError) return false;
  if (error.code === "ERR_CANCELED" && !error.isTimeoutAbort) return false;

  // Network drop, DNS/TLS glitch, CORS-masked Render 502/503, or timeout
  if (!error.response) {
    return true;
  }

  return TRANSIENT_HTTP_STATUSES.has(error.response.status);
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  if (error.userMessage) {
    return error.userMessage;
  }

  const responseMessage =
    typeof error.response?.data?.message === "string" ? error.response.data.message.trim() : "";
  if (responseMessage) {
    return responseMessage;
  }

  if (
    error.isTimeoutAbort ||
    error.code === "ECONNABORTED" ||
    String(error.message || "").toLowerCase().includes("timeout")
  ) {
    return "The server took too long to respond. If the backend is waking up on Render, please wait a moment and try again.";
  }

  if (!error.response || error.code === "ERR_NETWORK" || error.message === "Network Error") {
    const configWarning = useAppStore.getState().apiConfigWarning;
    if (configWarning) {
      return configWarning;
    }
    return "Unable to reach the server. The backend may be starting up or temporarily unavailable — please try again shortly.";
  }

  const status = error.response.status;
  if (status === 502 || status === 503 || status === 504) {
    return "The server is temporarily unavailable or waking up. Please try again in a moment.";
  }
  if (status === 429) {
    return "Too many requests right now. Please wait a moment before trying again.";
  }
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return "Access was blocked by the server (403). Verify that CLIENT_URL on Render matches your Vercel domain.";
  }
  if (status === 404) {
    return "The requested API endpoint could not be found (404).";
  }

  return error.message || fallback;
}

const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor: guard misconfigured prod URL & attach Authorization Bearer token
api.interceptors.request.use((config) => {
  const env = getEnv();
  if (env.PROD && !API_BASE_URL) {
    const err = new Error(
      useAppStore.getState().apiConfigWarning ||
        "Production VITE_API_URL is misconfigured and cannot target localhost."
    );
    err.userMessage = err.message;
    err.isConfigError = true;
    return Promise.reject(err);
  }

  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Response interceptor:
// 1. Limited retry for transient failures on SAFE GET requests ONLY (never retry POST/PUT/PATCH/DELETE).
// 2. Clear auth ONLY when the backend confirms HTTP 401 (never on network errors, timeouts, or 503s).
// 3. Attach human-friendly userMessage so generic "Network Error" never leaks to UI.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;

    // 1. Safe GET retry for transient connection / cold-start failures
    const method = String(config?.method || "").toLowerCase();
    const retryCount = config?._retryCount || 0;
    if (
      config &&
      method === "get" &&
      !config._skipRetry &&
      isTransientError(error) &&
      retryCount < MAX_SAFE_GET_RETRIES
    ) {
      config._retryCount = retryCount + 1;
      const backoffMs = 1500 * config._retryCount;
      await delay(backoffMs);
      return api(config);
    }

    // 2. Only invalidate session when the backend explicitly confirms 401 Unauthorized
    const isAuthAttempt =
      config?.url?.includes("/auth/login") || config?.url?.includes("/auth/register");

    if (error?.response?.status === 401 && !isAuthAttempt) {
      const hadToken = Boolean(getStoredToken());
      useStudioStore.getState().logout();
      useAppStore.getState().setStartupState(STARTUP_STATES.UNAUTHENTICATED, { error: null });
      if (hadToken) {
        useAppStore
          .getState()
          .setSessionMessage(
            error.response?.data?.message || "Your session has expired. Please sign in again."
          );
      }
    }

    // 3. Normalize error message for all UI consumers
    if (error && typeof error === "object") {
      error.userMessage = getApiErrorMessage(error);
    }

    return Promise.reject(error);
  }
);

function assertJsonObjectResponse(data, endpointName) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const err = new Error(
      `Unexpected non-JSON response from ${endpointName}. Verify VITE_API_URL points to your Render backend API.`
    );
    err.userMessage = err.message;
    err.isConfigError = true;
    throw err;
  }
  return data;
}

/**
 * Executes a GET request with BOTH Axios timeout AND AbortController hard timeout,
 * ensuring sockets cannot hang past timeoutMs in any browser/proxy environment.
 */
async function getWithStrictTimeout(url, timeoutMs) {
  const controller = new AbortController();
  let didAbortForTimeout = false;
  const timer = setTimeout(() => {
    didAbortForTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await api.get(url, {
      timeout: timeoutMs,
      signal: controller.signal,
      _skipRetry: true
    });
    return response.data;
  } catch (error) {
    if (didAbortForTimeout) {
      error.isTimeoutAbort = true;
      error.code = "ECONNABORTED";
      error.userMessage = getApiErrorMessage(error);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Lightweight health & readiness endpoints (cold-start state machine owns bounded retries)
export const getHealth = async ({ timeout = HEALTH_TIMEOUT_MS } = {}) => {
  const data = await getWithStrictTimeout("/health", timeout);
  return assertJsonObjectResponse(data, "/api/health");
};

export const getReady = async ({ timeout = HEALTH_TIMEOUT_MS } = {}) => {
  const data = await getWithStrictTimeout("/ready", timeout);
  return assertJsonObjectResponse(data, "/api/ready");
};

// Phase 2: Authentication API
export const authApi = {
  register: (payload) => api.post("/auth/register", payload).then((res) => res.data),
  login: (payload) => api.post("/auth/login", payload).then((res) => res.data),
  me: async ({ timeout = AUTH_ME_TIMEOUT_MS } = {}) => {
    const data = await getWithStrictTimeout("/auth/me", timeout);
    return assertJsonObjectResponse(data, "/api/auth/me");
  }
};

export const projectApi = {
  list: () => api.get("/projects").then((res) => res.data),
  create: (payload) => api.post("/projects", payload).then((res) => res.data),
  get: (id) => api.get(`/projects/${id}`).then((res) => res.data),
  run: (id, autoMode = false) =>
    api
      .post(`/projects/${id}/run`, { autoMode }, { timeout: AI_EXECUTION_TIMEOUT_MS })
      .then((res) => res.data),
  approve: (id, agentKey) =>
    api.post(`/projects/${id}/agents/${agentKey}/approve`).then((res) => res.data),
  regenerate: (id, agentKey) =>
    api
      .post(`/projects/${id}/agents/${agentKey}/regenerate`, {}, { timeout: 90000 })
      .then((res) => res.data),
  getReport: (id, agentKey) =>
    api.get(`/projects/${id}/agents/${agentKey}/report`).then((res) => res.data),
  updateReport: (id, agentKey, content) =>
    api.put(`/projects/${id}/agents/${agentKey}/report`, { content }).then((res) => res.data),
  email: (id, email) =>
    api
      .post(`/projects/${id}/email`, { email }, { timeout: EXPORT_TIMEOUT_MS })
      .then((res) => res.data)
};

function triggerBlobDownload(data, mimeType, filename) {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function formatExportSlug(startupName) {
  return (
    (startupName || "venture")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "venture"
  );
}

// Phase 8: Export and Email API client
export const exportApi = {
  downloadPdf: async (projectId, startupName = "venture") => {
    const res = await api.get(`/projects/${projectId}/export/pdf`, {
      responseType: "blob",
      timeout: EXPORT_TIMEOUT_MS,
      _skipRetry: true
    });
    triggerBlobDownload(res.data, "application/pdf", `${formatExportSlug(startupName)}-venture-report.pdf`);
    return true;
  },

  downloadMarkdown: async (projectId, startupName = "venture") => {
    const res = await api.get(`/projects/${projectId}/export/markdown`, {
      responseType: "blob",
      timeout: EXPORT_TIMEOUT_MS,
      _skipRetry: true
    });
    triggerBlobDownload(
      res.data,
      "text/markdown;charset=utf-8",
      `${formatExportSlug(startupName)}-venture-report.md`
    );
    return true;
  },

  downloadJson: async (projectId, startupName = "venture") => {
    const res = await api.get(`/projects/${projectId}/export/json`, {
      responseType: "blob",
      timeout: EXPORT_TIMEOUT_MS,
      _skipRetry: true
    });
    triggerBlobDownload(
      res.data,
      "application/json;charset=utf-8",
      `${formatExportSlug(startupName)}-venture-report.json`
    );
    return true;
  },

  sendEmail: async (projectId, email) => {
    const res = await api.post(
      `/projects/${projectId}/email`,
      { email },
      { timeout: EXPORT_TIMEOUT_MS }
    );
    return res.data;
  }
};

export const boardroomApi = {
  debate: (projectId, payload) => {
    const data = typeof payload === "string" ? { question: payload } : payload;
    return api
      .post(`/projects/${projectId}/boardroom`, data, { timeout: AI_EXECUTION_TIMEOUT_MS })
      .then((res) => res.data);
  },
  listSessions: (projectId) => api.get(`/projects/${projectId}/boardroom`).then((res) => res.data),
  getSession: (projectId, sessionId) =>
    api.get(`/projects/${projectId}/boardroom/${sessionId}`).then((res) => res.data)
};

export const analyticsApi = {
  overview: () => api.get("/analytics/overview").then((res) => res.data),
  getProjectAnalytics: (projectId) =>
    api.get(`/analytics/projects/${projectId}`).then((res) => res.data)
};

export const memoryApi = {
  search: (query, options = {}) =>
    api.get("/memory/search", { params: { q: query, ...options } }).then((res) => res.data)
};

export default api;
