import { create } from "zustand";

export const useAppStore = create((set) => ({
  backendStatus: "idle", // "idle" | "checking" | "waking" | "ready" | "unavailable"
  databaseMode: null,
  healthData: null,
  isLoadingHealth: false,
  attempt: 0,
  elapsedSeconds: 0,
  error: null,
  apiConfigWarning: null,
  sessionMessage: null,

  setChecking: () =>
    set({
      backendStatus: "checking",
      isLoadingHealth: true,
      error: null
    }),

  setWaking: ({ attempt = 1, elapsedSeconds = 0 } = {}) =>
    set({
      backendStatus: "waking",
      isLoadingHealth: true,
      attempt,
      elapsedSeconds,
      error: null
    }),

  setHealthData: (data) =>
    set({
      backendStatus: data?.ok && data?.ready !== false ? "ready" : "waking",
      databaseMode: data?.database || null,
      healthData: data,
      isLoadingHealth: !(data?.ok && data?.ready !== false),
      error: null
    }),

  setHealthError: (error) =>
    set({
      backendStatus: "unavailable",
      isLoadingHealth: false,
      error: typeof error === "string" ? error : error?.userMessage || error?.message || "Failed to reach backend",
      healthData: null
    }),

  setIsLoadingHealth: (isLoadingHealth) => set({ isLoadingHealth }),
  setApiConfigWarning: (apiConfigWarning) => set({ apiConfigWarning }),
  setSessionMessage: (sessionMessage) => set({ sessionMessage }),
  clearSessionMessage: () => set({ sessionMessage: null })
}));
