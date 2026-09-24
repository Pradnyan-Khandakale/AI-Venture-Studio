import { create } from "zustand";

function getInitialAuth() {
  const token = localStorage.getItem("avs_token") || null;
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("avs_user") || "null");
  } catch (_e) {
    user = null;
  }
  return { token, user, isAuthenticated: Boolean(token && user) };
}

export const useStudioStore = create((set) => ({
  selectedProjectId: localStorage.getItem("avs_project_id") || null,
  auth: getInitialAuth(),
  setSelectedProject: (p) => {
    const id = p?._id || p?.id || p || null;
    if (id) localStorage.setItem("avs_project_id", id);
    else localStorage.removeItem("avs_project_id");
    set({ selectedProjectId: id });
  },
  setAuth: ({ token, user }) => {
    if (token) localStorage.setItem("avs_token", token);
    if (user) localStorage.setItem("avs_user", JSON.stringify(user));
    set({ auth: { token, user, isAuthenticated: Boolean(token && user) } });
  },
  logout: () => {
    localStorage.removeItem("avs_token");
    localStorage.removeItem("avs_user");
    localStorage.removeItem("avs_project_id");
    set({ auth: { token: null, user: null, isAuthenticated: false }, selectedProjectId: null });
  },
  restoreSession: () => set({ auth: getInitialAuth(), selectedProjectId: localStorage.getItem("avs_project_id") || null })
}));
