import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Phase 1: API foundation health check
export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Placeholder API stubs for future phases (Phase 2+)
function notImplemented(name) {
  return Promise.reject(new Error(`${name} is deferred to future phases`));
}

export const authApi = {
  register: () => notImplemented("authApi.register"),
  login: () => notImplemented("authApi.login")
};

export const projectApi = {
  list: () => notImplemented("projectApi.list"),
  create: () => notImplemented("projectApi.create"),
  get: () => notImplemented("projectApi.get"),
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

