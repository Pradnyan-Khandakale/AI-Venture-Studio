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

// Placeholder API stubs for future phases (Phase 3+)
function notImplemented(name) {
  return Promise.reject(new Error(`${name} is deferred to future phases`));
}

export const projectApi = {
  list: () => api.get("/projects").then((res) => res.data),
  create: (payload) => api.post("/projects", payload).then((res) => res.data),
  get: (id) => api.get(`/projects/${id}`).then((res) => res.data),
  run: () => notImplemented("projectApi.run"),
  approve: () => notImplemented("projectApi.approve"),
  regenerate: () => notImplemented("projectApi.regenerate"),
  email: () => notImplemented("projectApi.email"),
  export: () => ""
};

export const boardroomApi = {
  debate: () => notImplemented("boardroomApi.debate")
};

export const analyticsApi = {
  overview: () => notImplemented("analyticsApi.overview")
};

export default api;
