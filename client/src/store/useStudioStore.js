import { create } from "zustand";

function readStorage(key) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota/privacy restrictions
  }
}

function removeStorage(key) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export function getStoredToken() {
  const token = readStorage("avs_token");
  return token && token !== "null" && token !== "undefined" ? token : null;
}

function getInitialAuth() {
  const token = getStoredToken();
  let user = null;
  try {
    user = JSON.parse(readStorage("avs_user") || "null");
  } catch {
    user = null;
  }
  return {
    token,
    user,
    isAuthenticated: Boolean(token && user)
  };
}

const initialAuth = getInitialAuth();

export const useStudioStore = create((set) => ({
  selectedProjectId: readStorage("avs_project_id") || null,
  activeView: readStorage("avs_project_id") ? "studio" : "dashboard",
  setActiveView: (view) => set({ activeView: view }),

  auth: initialAuth,

  setSelectedProject: (p) => {
    const id = p?._id || p?.id || p || null;
    if (id) {
      writeStorage("avs_project_id", id);
      set({ selectedProjectId: id, activeView: "studio" });
    } else {
      removeStorage("avs_project_id");
      set((state) => ({
        selectedProjectId: null,
        activeView: state.activeView === "studio" || state.activeView === "boardroom" ? "dashboard" : state.activeView
      }));
    }
  },

  setAuth: ({ token, user }) => {
    if (token) writeStorage("avs_token", token);
    if (user) writeStorage("avs_user", JSON.stringify(user));
    set({
      auth: { token, user, isAuthenticated: Boolean(token && user) }
    });
  },

  logout: () => {
    removeStorage("avs_token");
    removeStorage("avs_user");
    removeStorage("avs_project_id");
    set({
      auth: { token: null, user: null, isAuthenticated: false },
      selectedProjectId: null,
      activeView: "dashboard"
    });
  },

  restoreSession: () => {
    const nextAuth = getInitialAuth();
    set({
      auth: nextAuth,
      selectedProjectId: readStorage("avs_project_id") || null
    });
  }
}));
