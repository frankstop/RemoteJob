import type { JobStatus, UserState } from "./types";

const key = "remotejob:user-state:v1";

export const defaultState: UserState = {
  jobs: {},
  companies: {},
  prefs: {
    query: "",
    minSalary: 0,
    hideSeen: false,
    hideSkipped: false,
    hideBlocked: true,
  },
  applyCart: [],
};

export function loadUserState(): UserState {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultState;
  try {
    return { ...defaultState, ...JSON.parse(raw) } as UserState;
  } catch {
    return defaultState;
  }
}

export function saveUserState(state: UserState) {
  localStorage.setItem(key, JSON.stringify(state));
}

export function statusPatch(status: JobStatus) {
  const now = new Date().toISOString();
  return {
    status,
    seenAt: now,
    ...(status === "saved" ? { savedAt: now } : {}),
    ...(status === "applied" ? { appliedAt: now } : {}),
  };
}

export function downloadState(state: UserState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `remotejob-state-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

