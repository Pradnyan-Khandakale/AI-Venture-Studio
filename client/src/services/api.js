import axios from "axios";
import { useStudioStore } from "../store/useStudioStore.js";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor: attach Authorization Bearer token when available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("avs_token");
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 Unauthorized for authenticated endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthAttempt =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !isAuthAttempt) {
      useStudioStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Health check endpoint
export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Phase 2: Authentication API
export const authApi = {
  register: (payload) => api.post("/auth/register", payload).then((res) => res.data),
  login: (payload) => api.post("/auth/login", payload).then((res) => res.data),
  me: () => api.get("/auth/me").then((res) => res.data)
};

export const projectApi = {
  list: () => api.get("/projects").then((res) => res.data),
  create: (payload) => api.post("/projects", payload).then((res) => res.data),
  get: (id) => api.get(`/projects/${id}`).then((res) => res.data),
  run: (id, autoMode = false) => api.post(`/projects/${id}/run`, { autoMode }).then((res) => res.data),
  approve: (id, agentKey) => api.post(`/projects/${id}/agents/${agentKey}/approve`).then((res) => res.data),
  regenerate: (id, agentKey) => api.post(`/projects/${id}/agents/${agentKey}/regenerate`).then((res) => res.data),
  getReport: (id, agentKey) => api.get(`/projects/${id}/agents/${agentKey}/report`).then((res) => res.data),
  updateReport: (id, agentKey, content) => api.put(`/projects/${id}/agents/${agentKey}/report`, { content }).then((res) => res.data)
};

export const boardroomApi = {
  debate: (projectId, payload) => {
    const data = typeof payload === "string" ? { question: payload } : payload;
    return api.post(`/projects/${projectId}/boardroom`, data).then((res) => res.data);
  },
  listSessions: (projectId) => api.get(`/projects/${projectId}/boardroom`).then((res) => res.data),
  getSession: (projectId, sessionId) => api.get(`/projects/${projectId}/boardroom/${sessionId}`).then((res) => res.data)
};
export const analyticsApi = { overview: () => Promise.reject(new Error("Deferred to Phase 7")) };

export default api;
