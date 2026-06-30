// =============================================================================
// Kairos One — Agent Pipeline Hook
// Provides access to pipeline state and the runPipeline function.
// =============================================================================

import { useCallback } from "react";
import { useAgentStore } from "@/stores/agent-store";

export function useAgentPipeline() {
  const pipeline = useAgentStore((s) => s.pipeline);
  const runPipelineSequence = useAgentStore((s) => s.runPipelineSequence);
  const resetPipeline = useAgentStore((s) => s.resetPipeline);

  const isRunning = pipeline.isRunning;

  const currentAgent = pipeline.agents.find((a) => a.status === "working");
  const currentAgentType = currentAgent?.type ?? null;

  const runPipeline = useCallback(
    async (
      trigger: string,
      missionId: string
    ) => {
      await runPipelineSequence(trigger, missionId);
    },
    [runPipelineSequence]
  );

  return {
    pipeline,
    isRunning,
    currentAgentType,
    runPipeline,
    resetPipeline,
  };
}

