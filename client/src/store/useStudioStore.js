import { create } from "zustand";

function getInitialAuth() {
  const token = localStorage.getItem("avs_token") || null;
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("avs_user") || "null");
  } catch (_e) {
    user = null;
  }
  return {
    token,
    user,
    isAuthenticated: Boolean(token && user)
  };
}

export const useStudioStore = create((set) => ({
  selectedProject: null,
  auth: getInitialAuth(),
  setSelectedProject: (project) => set({ selectedProject: project }),
  setAuth: ({ token, user }) => {
    if (token) localStorage.setItem("avs_token", token);
    if (user) localStorage.setItem("avs_user", JSON.stringify(user));
    set({
      auth: {
        token: token || null,
        user: user || null,
        isAuthenticated: Boolean(token && user)
      }
    });
  },
  logout: () => {

    localStorage.removeItem("avs_token");
    localStorage.removeItem("avs_user");
    set({
      auth: {
        token: null,
        user: null,
        isAuthenticated: false
      },
      selectedProject: null
    });
  },
  restoreSession: () => {
    set({ auth: getInitialAuth() });
  }
}));
