// =============================================================================
// Kairos One — UI Store (Zustand)
// Manages all overlay/drawer/panel states for the OS-like single-screen UX.
// =============================================================================

import { create } from "zustand";
import type { Toast } from "@/types";

interface UIState {
  // Panel states
  sidebarCollapsed: boolean;
  missionDrawerOpen: boolean;
  missionDrawerId: string | null;
  calendarExpanded: boolean;
  insightsWindowOpen: boolean;
  assistantOpen: boolean;
  recoveryOverlayOpen: boolean;
  createMissionOpen: boolean;

  // Toasts
  toasts: Toast[];

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMissionDrawer: (id: string) => void;
  closeMissionDrawer: () => void;
  toggleCalendar: () => void;
  setCalendarExpanded: (expanded: boolean) => void;
  toggleInsights: () => void;
  setInsightsOpen: (open: boolean) => void;
  toggleAssistant: () => void;
  setAssistantOpen: (open: boolean) => void;
  openRecovery: () => void;
  closeRecovery: () => void;
  openCreateMission: () => void;
  closeCreateMission: () => void;
  closeTopmost: () => void;

  // Toast actions
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  missionDrawerOpen: false,
  missionDrawerId: null,
  calendarExpanded: false,
  insightsWindowOpen: false,
  assistantOpen: false,
  recoveryOverlayOpen: false,
  createMissionOpen: false,
  toasts: [],

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  openMissionDrawer: (id) =>
    set({ missionDrawerOpen: true, missionDrawerId: id }),
  closeMissionDrawer: () =>
    set({ missionDrawerOpen: false, missionDrawerId: null }),

  toggleCalendar: () =>
    set((s) => ({ calendarExpanded: !s.calendarExpanded })),
  setCalendarExpanded: (expanded) => set({ calendarExpanded: expanded }),

  toggleInsights: () =>
    set((s) => ({ insightsWindowOpen: !s.insightsWindowOpen })),
  setInsightsOpen: (open) => set({ insightsWindowOpen: open }),

  toggleAssistant: () =>
    set((s) => ({ assistantOpen: !s.assistantOpen })),
  setAssistantOpen: (open) => set({ assistantOpen: open }),

  openRecovery: () => set({ recoveryOverlayOpen: true }),
  closeRecovery: () => set({ recoveryOverlayOpen: false }),

  openCreateMission: () => set({ createMissionOpen: true }),
  closeCreateMission: () => set({ createMissionOpen: false }),

  // Close the topmost overlay (for Escape key handling)
  closeTopmost: () => {
    const state = get();
    if (state.recoveryOverlayOpen) {
      set({ recoveryOverlayOpen: false });
    } else if (state.createMissionOpen) {
      set({ createMissionOpen: false });
    } else if (state.assistantOpen) {
      set({ assistantOpen: false });
    } else if (state.insightsWindowOpen) {
      set({ insightsWindowOpen: false });
    } else if (state.missionDrawerOpen) {
      set({ missionDrawerOpen: false, missionDrawerId: null });
    }
  },

  addToast: (toast) => {
    const id = `toast-${crypto.randomUUID()}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

