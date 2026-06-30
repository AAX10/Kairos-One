// =============================================================================
// Kairos One — Mission Store (Zustand)
// Domain state for missions, selected mission, and Mission Success KPI.
// =============================================================================

import { create } from "zustand";
import type { MissionNode, MissionSuccess } from "@/types";

interface MissionState {
  missions: MissionNode[];
  selectedMissionId: string | null;
  missionSuccess: MissionSuccess | null;

  setMissions: (missions: MissionNode[]) => void;
  selectMission: (id: string | null) => void;
  setMissionSuccess: (success: MissionSuccess) => void;
  addMission: (mission: MissionNode) => void;
  toggleTask: (taskId: string) => void;
  updateMission: (id: string, updates: Partial<MissionNode>) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  missions: [],
  selectedMissionId: null,
  missionSuccess: null,

  setMissions: (missions) => set({ missions }),

  selectMission: (id) => set({ selectedMissionId: id }),

  setMissionSuccess: (success) => set({ missionSuccess: success }),

  addMission: (mission) =>
    set((state) => ({ missions: [...state.missions, mission] })),

  toggleTask: (taskId) =>
    set((state) => ({
      missions: state.missions.map((m) => {
        if (m.id !== taskId) return m;
        const isCompleting = m.status !== "completed";
        return {
          ...m,
          status: isCompleting
            ? ("completed" as const)
            : ("pending" as const),
          completionPercentage: isCompleting ? 100 : 0,
          completedAt: isCompleting ? new Date().toISOString() : null,
        };
      }),
    })),

  updateMission: (id, updates) =>
    set((state) => ({
      missions: state.missions.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
}));

