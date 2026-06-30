// =============================================================================
// Kairos One — Agent Store (Zustand)
// Manages agent pipeline visualization with real-time polling.
// =============================================================================

import { create } from "zustand";
import type { AgentType, AgentState, AgentPipelineState, AgentActivity } from "@/types";
import { runAgentPipeline, getAgentPipelineStatus } from "@/services/api";

const AGENT_ORDER: AgentType[] = [
  "planner",
  "scheduler",
  "risk",
  "recovery",
  "coach",
];

function createIdleAgents(): AgentState[] {
  return AGENT_ORDER.map((type) => ({
    type,
    status: "idle" as const,
    currentAction: "",
    result: "",
    startedAt: null,
    completedAt: null,
  }));
}

interface AgentStoreState {
  pipeline: AgentPipelineState;
  activities: AgentActivity[];

  setPipeline: (pipeline: AgentPipelineState) => void;
  setActivities: (activities: AgentActivity[]) => void;
  addActivity: (activity: AgentActivity) => void;
  resetPipeline: () => void;

  // Triggers the backend pipeline and polls for status
  runPipelineSequence: (trigger: string, missionId: string) => Promise<void>;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  pipeline: {
    agents: createIdleAgents(),
    isRunning: false,
    trigger: "",
  },
  activities: [],

  setPipeline: (pipeline) => set({ pipeline }),

  setActivities: (activities) => set({ activities }),

  addActivity: (activity) =>
    set((s) => ({ activities: [activity, ...s.activities] })),

  resetPipeline: () =>
    set({
      pipeline: {
        agents: createIdleAgents(),
        isRunning: false,
        trigger: "",
      },
    }),

  runPipelineSequence: async (trigger, missionId) => {
    // 1. Set initial running state
    set({
      pipeline: { agents: createIdleAgents(), isRunning: true, trigger },
    });

    try {
      // 2. Trigger the backend pipeline (which runs asynchronously)
      await runAgentPipeline(missionId, trigger);
    } catch (err) {

      set((s) => ({ pipeline: { ...s.pipeline, isRunning: false } }));
      return;
    }

    // 3. Poll for status every 5000ms instead of 500ms to save quota
    return new Promise<void>((resolve) => {
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await getAgentPipelineStatus();
          
          set({ 
            pipeline: statusResponse.pipeline,
            activities: statusResponse.activities
          });

          // If backend says it's done, stop polling
          if (!statusResponse.pipeline.isRunning) {
            clearInterval(pollInterval);
            resolve();
          }
        } catch (err) {

        }
      }, 5000);
    });
  },
}));

