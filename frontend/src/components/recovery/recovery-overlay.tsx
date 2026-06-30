"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ArrowRight, Check, Loader2 } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useAgentStore } from "@/stores/agent-store";
import { useTriggerRecovery } from "@/hooks/use-recovery";
import { AgentIcon, AGENT_META } from "@/components/ui/agent-icon";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { BeforeAfterTimeline } from "./before-after-timeline";
import { recoveryOverlay, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/types";

function StatusIcon({ status }: { status: string }) {
  if (status === "finished") {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={SPRING.bouncy}
      >
        <Check size={14} className="text-emerald-400" />
      </motion.div>
    );
  }
  if (status === "working") {
    return <Loader2 size={14} className="animate-spin text-indigo-400" />;
  }
  return <div className="h-3 w-3 rounded-full bg-white/10" />;
}

export function RecoveryOverlay() {
  const isOpen = useUIStore((s) => s.recoveryOverlayOpen);
  const close = useUIStore((s) => s.closeRecovery);
  const pipeline = useAgentStore((s) => s.pipeline);
  const recovery = useTriggerRecovery();
  const plan = recovery.data;
  const pipelineComplete = !pipeline.isRunning && pipeline.agents.every(a => a.status === "finished");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={recoveryOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={SPRING.gentle}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 rounded-2xl border border-white/[0.08] bg-background/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
                  <ShieldAlert size={20} className="text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Recovery Mode
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {pipeline.isRunning
                      ? "Agents are rebuilding your schedule..."
                      : pipelineComplete
                      ? "Recovery plan generated"
                      : "Initializing recovery..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Agent Pipeline Status */}
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Agent Pipeline
                </p>
                <div className="space-y-2">
                  {pipeline.agents.map((agent, i) => {
                    const meta = AGENT_META[agent.type as AgentType];
                    return (
                      <motion.div
                        key={agent.type}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i, ...SPRING.gentle }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                          agent.status === "working" && "bg-white/[0.04]",
                          agent.status === "finished" && "bg-white/[0.02]"
                        )}
                      >
                        <AgentIcon
                          agent={agent.type as AgentType}
                          size="sm"
                          status={agent.status}
                        />
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              agent.status === "idle"
                                ? "text-muted-foreground/50"
                                : "text-foreground"
                            )}
                          >
                            {meta.label} Agent
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-2">
                            {agent.status === "working"
                              ? agent.currentAction
                              : agent.result}
                          </span>
                        </div>
                        <StatusIcon status={agent.status} />
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Results (only show when pipeline is complete and plan is available) */}
              {pipelineComplete && plan && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, ...SPRING.gentle }}
                  className="space-y-6"
                >
                  {/* Mission Success Change */}
                  <div className="flex items-center justify-center gap-6 py-4">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Before
                      </p>
                      <span className="text-2xl font-bold text-foreground tabular-nums">
                        {plan.missionSuccessBefore}%
                      </span>
                    </div>
                    <ArrowRight size={20} className="text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        After Recovery
                      </p>
                      <AnimatedNumber
                        value={plan.missionSuccessAfter}
                        suffix="%"
                        className="text-2xl font-bold text-rose-400"
                      />
                    </div>
                  </div>

                  {/* Before/After Timelines */}
                  <BeforeAfterTimeline
                    before={plan.originalTimeline}
                    after={plan.recoveredTimeline}
                  />

                  {/* Changes */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Changes Made
                    </p>
                    {plan.changes.map((change) => (
                      <div
                        key={change.description}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            variant={
                              change.type === "escalated"
                                ? "danger"
                                : change.type === "rescheduled"
                                ? "info"
                                : change.type === "compressed"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {change.type}
                          </StatusBadge>
                          <span className="text-xs text-foreground">
                            {change.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="line-through">{change.before}</span>
                          <ArrowRight size={10} />
                          <span className="text-foreground/80">{change.after}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/15 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-400/60 mb-1.5">
                      Recovery Explanation
                    </p>
                    <p className="text-xs text-indigo-200/80 leading-relaxed">
                      {plan.explanation}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {pipelineComplete && plan && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-4 flex gap-3"
              >
                <Button
                  onClick={close}
                  className="flex-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/20"
                >
                  Accept Recovery Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={close}
                  className="border-white/[0.08]"
                >
                  Modify
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
