import { create } from "zustand";

const savedToken = localStorage.getItem("avs_token") || null;
const savedUser = JSON.parse(localStorage.getItem("avs_user") || "null");

export const useStudioStore = create((set) => ({
  selectedProject: null,
  // TODO: Restore the saved avs_token and avs_user from localStorage.
  auth: {
    token: savedToken,
    user: savedUser
  },
  setSelectedProject: (project) => set({ selectedProject: project }),
  setAuth: ({ token, user }) => {
    // TODO: Persist the token and user in localStorage and store the session.
    if (token) localStorage.setItem("avs_token", token);
    if (user) localStorage.setItem("avs_user", JSON.stringify(user));
    set({ auth: { token, user } });
  },
  logout: () => {
    // TODO: Clear the stored session and reset the auth state and selected project.
    localStorage.removeItem("avs_token");
    localStorage.removeItem("avs_user");
    set({ auth: { token: null, user: null }, selectedProject: null });
  }
}));
