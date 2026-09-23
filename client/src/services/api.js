import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

api.interceptors.request.use((config) => {
  // TODO: Attach the saved avs_token as the Authorization bearer header.
  const token = localStorage.getItem("avs_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: On a 401 outside the login and register calls, clear the stored session and
    // TODO: reload the page.
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login") &&
      !error.config?.url?.includes("/auth/register")
    ) {
      localStorage.removeItem("avs_token");
      localStorage.removeItem("avs_user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

function notImplemented(name) {
  return Promise.reject(new Error(`${name} is not implemented yet`));
}

export const authApi = {
  // TODO: POST /auth/register and /auth/login and return response.data.
  register: (payload) => api.post("/auth/register", payload).then((res) => res.data),
  login: (payload) => api.post("/auth/login", payload).then((res) => res.data)
};

export const projectApi = {
  // TODO: Wire these to GET /projects, POST /projects, GET /projects/:id,
  // TODO: POST /projects/:id/run, POST /projects/:id/agents/:agentKey/approve,
  // TODO: POST /projects/:id/agents/:agentKey/regenerate, and POST /projects/:id/email.
  list: () => notImplemented("projectApi.list"),
  create: () => notImplemented("projectApi.create"),
  get: () => notImplemented("projectApi.get"),
  run: () => notImplemented("projectApi.run"),
  approve: () => notImplemented("projectApi.approve"),
  regenerate: () => notImplemented("projectApi.regenerate"),
  email: () => notImplemented("projectApi.email"),
  export: (id, format) => {
    // TODO: Return the `${baseURL}/exports/${id}/${format}` download URL.
    return "";
  }
};

export const boardroomApi = {
  // TODO: POST /boardroom/debate and return response.data.
  debate: () => notImplemented("boardroomApi.debate")
};

export const analyticsApi = {
  // TODO: GET /analytics and return response.data.
  overview: () => notImplemented("analyticsApi.overview")
};

export default api;
