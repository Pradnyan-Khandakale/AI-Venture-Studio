import { create } from "zustand";

export const useAppStore = create((set) => ({
  backendStatus: "unknown",
  databaseMode: null,
  healthData: null,
  isLoadingHealth: false,
  error: null,
  setHealthData: (data) =>
    set({
      backendStatus: data.ok ? "connected" : "error",
      databaseMode: data.database || null,
      healthData: data,
      error: null
    }),
  setHealthError: (error) =>
    set({
      backendStatus: "error",
      error: error.message || "Failed to reach backend",
      healthData: null
    }),
  setIsLoadingHealth: (isLoadingHealth) => set({ isLoadingHealth })
}));
