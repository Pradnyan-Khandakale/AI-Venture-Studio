import { create } from "zustand";

function getInitialAuth() {
  const token = localStorage.getItem("avs_token");
  const validToken = token && token !== "null" && token !== "undefined" ? token : null;
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("avs_user") || "null");
  } catch (_e) {
    user = null;
  }
  return {
    token: validToken,
    user,
    isAuthenticated: Boolean(validToken && user)
  };
}

const initialAuth = getInitialAuth();

export const useStudioStore = create((set) => ({
  selectedProjectId: localStorage.getItem("avs_project_id") || null,
  activeView: localStorage.getItem("avs_project_id") ? "studio" : "dashboard", // "dashboard" | "studio" | "boardroom" | "analytics" | "memory"
  setActiveView: (view) => set({ activeView: view }),

  auth: initialAuth,
  // "verifying" when a stored token exists and needs /api/auth/me confirmation after backend wakes
  authStatus: initialAuth.token ? "verifying" : "unauthenticated", // "verifying" | "authenticated" | "unauthenticated" | "error"
  authError: null,

  setAuthStatus: (authStatus, authError = null) => set({ authStatus, authError }),

  setSelectedProject: (p) => {
    const id = p?._id || p?.id || p || null;
    if (id) {
      localStorage.setItem("avs_project_id", id);
      set({ selectedProjectId: id, activeView: "studio" });
    } else {
      localStorage.removeItem("avs_project_id");
      set((state) => ({
        selectedProjectId: null,
        activeView: state.activeView === "studio" || state.activeView === "boardroom" ? "dashboard" : state.activeView
      }));
    }
  },

  setAuth: ({ token, user }) => {
    if (token) localStorage.setItem("avs_token", token);
    if (user) localStorage.setItem("avs_user", JSON.stringify(user));
    set({
      auth: { token, user, isAuthenticated: Boolean(token && user) },
      authStatus: token && user ? "authenticated" : "unauthenticated",
      authError: null
    });
  },

  logout: () => {
    localStorage.removeItem("avs_token");
    localStorage.removeItem("avs_user");
    localStorage.removeItem("avs_project_id");
    set({
      auth: { token: null, user: null, isAuthenticated: false },
      authStatus: "unauthenticated",
      authError: null,
      selectedProjectId: null,
      activeView: "dashboard"
    });
  },

  restoreSession: () => {
    const nextAuth = getInitialAuth();
    set({
      auth: nextAuth,
      authStatus: nextAuth.token ? "verifying" : "unauthenticated",
      authError: null,
      selectedProjectId: localStorage.getItem("avs_project_id") || null
    });
  }
}));
