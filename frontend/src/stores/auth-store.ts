import { create } from "zustand";

export interface UserSettings {
  working_hours_start: string;
  working_hours_end: string;
  deep_work_duration_minutes: number;
  break_duration_minutes: number;
  calendar_sync_interval_minutes: number;
  time_zone: string;
}

export interface AuthState {
  uid: string | null;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: string | null;
  isCalendarConnected: boolean;
  lastSync: string | null;
  settings: UserSettings | null;
  
  // Actions
  setAuth: (data: Partial<AuthState>) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  logout: () => void;
}

const defaultSettings: UserSettings = {
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  deep_work_duration_minutes: 120,
  break_duration_minutes: 15,
  calendar_sync_interval_minutes: 15,
  time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  displayName: null,
  email: null,
  photoURL: null,
  provider: null,
  isCalendarConnected: false,
  lastSync: null,
  settings: null,

  setAuth: (data) => set((state) => ({ ...state, ...data })),
  
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings } as UserSettings
  })),

  logout: () => set({
    uid: null,
    displayName: null,
    email: null,
    photoURL: null,
    provider: null,
    isCalendarConnected: false,
    lastSync: null,
    settings: null
  })
}));
