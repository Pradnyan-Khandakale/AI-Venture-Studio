import { create } from "zustand";

export const STARTUP_STATES = {
  CHECKING_BACKEND: "checking_backend",
  BACKEND_WAKING: "backend_waking",
  BACKEND_UNAVAILABLE: "backend_unavailable",
  CHECKING_SESSION: "checking_session",
  AUTHENTICATED: "authenticated",
  UNAUTHENTICATED: "unauthenticated",
  SESSION_ERROR: "session_error"
};

export const useAppStore = create((set) => ({
  // Single finite startup state machine (prevents split-brain loading deadlocks)
  startupState: STARTUP_STATES.CHECKING_BACKEND,
  backendReachable: false,
  databaseReady: null,
  databaseMode: null,
  healthData: null,
  attempt: 0,
  elapsedSeconds: 0,
  error: null,
  apiConfigWarning: null,
  sessionMessage: null,

  setStartupState: (startupState, patch = {}) =>
    set((state) => ({
      ...state,
      startupState,
      ...patch
    })),

  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),

  setHealthData: (data) =>
    set((state) => ({
      ...state,
      backendReachable: Boolean(data?.ok),
      databaseReady: data?.ok ? data?.ready !== false : false,
      databaseMode: data?.database || null,
      healthData: data || null
    })),

  setApiConfigWarning: (apiConfigWarning) => set({ apiConfigWarning }),
  setSessionMessage: (sessionMessage) => set({ sessionMessage }),
  clearSessionMessage: () => set({ sessionMessage: null }),

  enterLoginView: () =>
    set((state) => ({
      ...state,
      startupState: STARTUP_STATES.UNAUTHENTICATED,
      error: null
    })),

  resetForTests: () =>
    set({
      startupState: STARTUP_STATES.CHECKING_BACKEND,
      backendReachable: false,
      databaseReady: null,
      databaseMode: null,
      healthData: null,
      attempt: 0,
      elapsedSeconds: 0,
      error: null,
      apiConfigWarning: null,
      sessionMessage: null
    })
}));
