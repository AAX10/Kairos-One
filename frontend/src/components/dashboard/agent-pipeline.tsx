"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Check, ArrowRight, Loader2, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AgentIcon, AGENT_META } from "@/components/ui/agent-icon";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/state-panels";
import { useAgentStore } from "@/stores/agent-store";
import { useAgentPipelineData } from "@/hooks/use-dashboard";
import { fadeInUp, SPRING, pipelineNode, pipelineConnector } from "@/lib/motion";
import { cn } from "@/lib/utils";
import SoftAurora from "@/components/ui/soft-aurora";
import type { AgentStatus, AgentType } from "@/types";

function StatusIndicator({ status }: { status: AgentStatus }) {
  if (status === "finished") {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={SPRING.bouncy}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
      >
        <Check size={10} className="text-white" />
      </motion.div>
    );
  }
  if (status === "working") {
    return <Loader2 size={16} className="animate-spin text-indigo-400" />;
  }
  if (status === "thinking") {
    return (
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <Brain size={14} className="text-purple-400" />
      </motion.div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
        ✕
      </div>
    );
  }
  return <div className="h-3 w-3 rounded-full bg-white/10" />;
}

function ElapsedTime({ startedAt, isRunning }: { startedAt: string | null; isRunning: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || !isRunning) return;
    const start = new Date(startedAt).getTime();

    const tick = () => {
      setElapsed(Math.max(0, Date.now() - start));
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [startedAt, isRunning]);

  if (!startedAt) return null;

  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono mt-1">
      <Clock size={10} />
      {(elapsed / 1000).toFixed(1)}s
    </div>
  );
}

export function AgentPipeline() {
  const pipeline = useAgentStore((s) => s.pipeline);
  const runPipelineSequence = useAgentStore((s) => s.runPipelineSequence);
  const { isLoading } = useAgentPipelineData();
  const queryClient = useQueryClient();
  const prevIsRunning = useRef(pipeline.isRunning);

  useEffect(() => {
    if (prevIsRunning.current && !pipeline.isRunning) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["agent-activities"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission-graph"] });
      queryClient.invalidateQueries({ queryKey: ["memory-insights"] });
    }
    prevIsRunning.current = pipeline.isRunning;
  }, [pipeline.isRunning, queryClient]);

  // Pipeline is triggered by user actions (like mission creation)

  if (isLoading) {
    return <SkeletonCard className="col-span-full" lines={2} />;
  }

  // Not checking isError here to avoid hiding pipeline during intermittent polling failures
  // But we handle empty/missing pipeline state
  if (!pipeline || !pipeline.agents) {
    return (
      <GlassCard className="col-span-full flex items-center justify-center h-[120px]">
        <EmptyState title="Pipeline Unavailable" />
      </GlassCard>
    );
  }

  const agents = pipeline.agents;

  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
      className="col-span-full relative overflow-hidden"
    >
      <SoftAurora
        speed={0.5}
        scale={1.2}
        brightness={1.5}
        color1="#3b82f6"
        color2="#8b5cf6"
        noiseFrequency={2.0}
        noiseAmplitude={0.8}
        bandHeight={0.6}
        bandSpread={1.2}
        octaveDecay={0.2}
        layerOffset={0.5}
        colorSpeed={0.8}
        enableMouseInteraction={true}
        mouseInfluence={0.15}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Agent Pipeline</h2>
          <span className="text-xs text-muted-foreground">
            {pipeline.isRunning ? (
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
                </span>
                Processing...
              </span>
            ) : (
              pipeline.trigger || "Idle"
            )}
          </span>
        </div>

        {/* Pipeline visualization */}
        <div className="flex items-center justify-between gap-1">
          {agents.map((agent, i) => {
            const meta = AGENT_META[agent.type as AgentType];
            const isLast = i === agents.length - 1;

            return (
              <div key={agent.type} className="flex items-center flex-1 min-w-0">
                {/* Agent node */}
                <motion.div
                  layout
                  variants={pipelineNode}
                  animate={agent.status}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 transition-all overflow-hidden border",
                    (agent.status === "working" || agent.status === "thinking") && "bg-black/40 backdrop-blur-md border-white/15 shadow-xl",
                    agent.status === "finished" && "bg-black/20 backdrop-blur-sm border-white/5",
                    agent.status === "idle" && (pipeline.isRunning ? "bg-transparent border-transparent" : "bg-black/10 backdrop-blur-sm border-white/5 shadow-sm"),
                    (agent.status === "working" || agent.status === "thinking" || agent.status === "finished") ? "min-w-[120px]" : "min-w-[90px]"
                  )}
                >
                  <AgentIcon agent={agent.type as AgentType} size="md" status={agent.status} />
                  <span
                    className={cn(
                      "text-[11px] font-medium text-center",
                      agent.status === "idle"
                        ? "text-muted-foreground/50"
                        : meta.color
                    )}
                  >
                    {meta.label}
                  </span>

                  <StatusIndicator status={agent.status} />

                  {/* Action text */}
                  <span className="text-[10px] text-muted-foreground text-center line-clamp-2 min-h-[2.5em] mt-1">
                    {agent.status === "working" || agent.status === "thinking"
                      ? agent.currentAction
                      : agent.status === "finished"
                        ? agent.result
                        : agent.status === "idle"
                          ? "Waiting"
                          : "Error"}
                  </span>

                  {/* Extra Details when active or finished */}
                  <AnimatePresence>
                    {(agent.status === "working" || agent.status === "thinking" || agent.status === "finished") && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col items-center gap-1 mt-1 w-full border-t border-white/[0.06] pt-2"
                      >
                        {(agent.status === "working" || agent.status === "thinking") && (
                          <ElapsedTime startedAt={agent.startedAt} isRunning={true} />
                        )}
                        {agent.status === "finished" && (
                          <>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>Conf: <span className="text-foreground">{agent.confidence ?? 0}%</span></span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 font-mono mt-0.5">
                              <Clock size={9} />
                              {((agent.executionDurationMs || 0) / 1000).toFixed(1)}s
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Connector arrow */}
                {!isLast && (
                  <motion.div
                    variants={pipelineConnector}
                    animate={
                      agent.status === "finished" ? "active" : "inactive"
                    }
                    className="flex items-center justify-center px-1 shrink-0"
                  >
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
