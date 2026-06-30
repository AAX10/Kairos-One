// =============================================================================
// Kairos One — Recovery Hook
// Coordinates the "I Missed Today" recovery flow with agent pipeline animation.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerRecovery } from "@/services/api";
import { useAgentStore } from "@/stores/agent-store";
import { useUIStore } from "@/stores/ui-store";
import type { RecoveryPlan } from "@/types";

export function useTriggerRecovery() {
  const runPipelineSequence = useAgentStore((s) => s.runPipelineSequence);
  const openRecovery = useUIStore((s) => s.openRecovery);
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RecoveryPlan> => {
      // Get missions to find a valid ID for the pipeline
      const { getMissions } = await import("@/services/api");
      const missions = await getMissions();
      const missionId = missions[0]?.id || "";

      // Start the visible agent pipeline sequence manually first for the UI feel
      await runPipelineSequence("I Missed Today", missionId);

      // Hit backend and actually run the orchestrator (this sets it to running on backend)
      const res = await triggerRecovery("missed-today", missionId);
      
      // Invalidate dashboard caches to update UI without refresh
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["agent-pipeline"] });

      return res;
    },
    onSuccess: () => {
      addToast({
        title: "Recovery Started",
        description: "AI Pipeline is recalibrating your mission plan.",
        variant: "success",
      });
    },
    onError: () => {
      addToast({
        title: "Recovery failed",
        description: "Could not start recovery plan. Please try again.",
        variant: "error",
      });
    },
  });
}

