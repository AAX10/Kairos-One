"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, ShieldAlert, ArrowRight, Check, Trash2, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUIStore } from "@/stores/ui-store";
import { useMission, useMissionGraphData, useAllMissionNodes, useToggleTask, useDeleteTask, useRenameMission, useChangeDeadline } from "@/hooks/use-missions";
import { useAgentPipeline } from "@/hooks/use-agent-pipeline";
import { useAgentStore } from "@/stores/agent-store";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { AgentIcon } from "@/components/ui/agent-icon";
import { SubtaskList } from "./subtask-list";
import { MissionGraph } from "./mission-graph";
import { slideFromRight, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function MissionDrawer() {
  const isOpen = useUIStore((s) => s.missionDrawerOpen);
  const missionId = useUIStore((s) => s.missionDrawerId);
  const close = useUIStore((s) => s.closeMissionDrawer);
  const { data: mission } = useMission(missionId);
  const { data: graphNodes } = useMissionGraphData(missionId);
  const { data: allNodes } = useAllMissionNodes();
  const { runPipeline, isRunning } = useAgentPipeline();
  const { mutate: toggleMission, isPending: isCompleting } = useToggleTask();
  const { mutate: deleteMission, isPending: isDeleting } = useDeleteTask();
  const { mutate: renameMission } = useRenameMission();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const { mutate: changeDeadline } = useChangeDeadline();
  const queryClient = useQueryClient();
  const prevIsRunning = useRef(isRunning);

  const activities = useAgentStore((s) => s.activities);
  const missionActivities = activities.filter((a) => a.relatedMissionId === missionId);

  useEffect(() => {
    if (prevIsRunning.current && !isRunning) {
      // Pipeline finished: invalidate to fetch new subtasks and graph data
      queryClient.invalidateQueries({ queryKey: ["mission", missionId] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["mission-graph"] });
    }
    prevIsRunning.current = isRunning;
  }, [isRunning, missionId, queryClient]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Drawer */}
          <motion.div
            variants={slideFromRight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING.default}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-[480px] overflow-y-auto border-l border-white/[0.06] bg-background/95 backdrop-blur-xl"
          >
            {mission && (
              <div className="flex flex-col min-h-screen">
                {/* Header */}
                <div className="sticky top-0 z-10 glass-heavy border-b border-white/[0.06] px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ProgressRing
                        value={mission.completionPercentage}
                        size={48}
                        strokeWidth={4}
                        color={mission.color}
                        showLabel
                      />
                      <div>
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (newName.trim() !== "" && newName !== mission.name) {
                                    renameMission({ id: mission.id, name: newName.trim() });
                                  }
                                  setIsEditingName(false);
                                }
                                if (e.key === "Escape") {
                                  setIsEditingName(false);
                                }
                              }}
                              className="h-7 rounded border border-white/[0.1] bg-black/50 px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                if (newName.trim() !== "" && newName !== mission.name) {
                                  renameMission({ id: mission.id, name: newName.trim() });
                                }
                                setIsEditingName(false);
                              }}
                            >
                              <Check size={14} className="text-emerald-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setIsEditingName(false)}
                            >
                              <X size={14} className="text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 group cursor-pointer"
                            onClick={() => { setIsEditingName(true); setNewName(mission.name); }}
                          >
                            <h2 className="text-base font-semibold text-foreground">
                              {mission.name}
                            </h2>
                            <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {mission.projectClassification && (
                            <StatusBadge variant="info">
                              {mission.projectClassification}
                            </StatusBadge>
                          )}
                          <StatusBadge
                            variant={
                              mission.priority === "critical"
                                ? "danger"
                                : mission.priority === "high"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {mission.priority}
                          </StatusBadge>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground group/deadline cursor-pointer">
                            <Clock size={11} />
                            {isEditingDeadline ? (
                              <input
                                autoFocus
                                type="date"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (newDeadline && newDeadline !== mission.deadline) {
                                      changeDeadline({ id: mission.id, deadline: newDeadline });
                                    }
                                    setIsEditingDeadline(false);
                                  }
                                  if (e.key === "Escape") {
                                    setIsEditingDeadline(false);
                                  }
                                }}
                                onBlur={() => {
                                  if (newDeadline && newDeadline !== mission.deadline) {
                                    changeDeadline({ id: mission.id, deadline: newDeadline });
                                  }
                                  setIsEditingDeadline(false);
                                }}
                                className="h-6 rounded border border-white/[0.1] bg-black/50 px-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              <span 
                                onClick={() => {
                                  setIsEditingDeadline(true);
                                  setNewDeadline(mission.deadline.split('T')[0]);
                                }}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                {formatDistanceToNow(new Date(mission.deadline), {
                                  addSuffix: true,
                                })}
                                <Pencil size={10} className="opacity-0 group-hover/deadline:opacity-100 transition-opacity" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={close}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6 px-6 py-5">
                  {/* Description */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {mission.description}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                      <span className="text-lg font-semibold tabular-nums text-foreground">
                        {mission.completionPercentage}%
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Complete
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                      <span className="text-lg font-semibold tabular-nums text-foreground">
                        {mission.actualHours}/{mission.estimatedHours}h
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Hours
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                      <span
                        className={cn(
                          "text-lg font-semibold tabular-nums",
                          mission.contributionToSuccess > 0
                            ? "text-emerald-400"
                            : mission.contributionToSuccess < 0
                              ? "text-rose-400"
                              : "text-foreground"
                        )}
                      >
                        {mission.contributionToSuccess > 0 ? "+" : ""}
                        {mission.contributionToSuccess}%
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Impact
                      </p>
                    </div>
                  </div>

                  {/* Risk Warning */}
                  {mission.contributionToSuccess < 0 && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/15 p-3">
                      <ShieldAlert size={14} className="text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-rose-400">At Risk</p>
                        <p className="text-[11px] text-rose-300/70 mt-0.5">
                          This mission is negatively affecting your overall Mission Success score. Consider prioritizing remaining tasks.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mission Graph */}
                  {graphNodes && graphNodes.length > 0 && (
                    <MissionGraph nodes={graphNodes} />
                  )}

                  {/* Agent Intelligence */}
                  {missionActivities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Agent Analysis
                      </p>
                      <div className="space-y-2">
                        {missionActivities.map((act) => (
                          <div key={act.id} className="flex gap-3 rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                            <AgentIcon agent={act.agent} size="sm" className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-foreground capitalize">
                                  {act.agent} Agent
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                {act.action}
                              </p>
                              {act.impact && (
                                <p className="text-[11px] text-indigo-300/80 mt-1">
                                  ↳ {act.impact}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Tasks ({mission.childNodes?.length ?? 0})
                    </p>
                    {mission.childNodes && (
                      <SubtaskList
                        tasks={mission.childNodes}
                        allNodes={allNodes ?? []}
                      />
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 glass-heavy border-t border-white/[0.06] px-6 py-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    disabled={isCompleting}
                    onClick={() => toggleMission(mission.id)}
                  >
                    <Check size={14} />
                    {mission.status === "completed" ? "Reopen Mission" : "Complete Mission"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10"
                    disabled={isRunning}
                    onClick={() => {
                      runPipeline("Manual analysis", mission.id);
                      close();
                    }}
                  >
                    <ArrowRight size={14} />
                    {isRunning ? "Running..." : "Agent Analysis"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 px-3"
                    disabled={isDeleting}
                    onClick={() => {
                      deleteMission(mission.id);
                      close();
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
