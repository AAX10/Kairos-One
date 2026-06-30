"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Clock, Scissors, Combine, CalendarClock, Trash2 } from "lucide-react";
import { useToggleTask, useSplitTask, useMergeTask, useRescheduleTask, useDeleteTask } from "@/hooks/use-missions";
import { StatusBadge } from "@/components/ui/status-badge";
import { SPRING, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MissionNode } from "@/types";
import { useState } from "react";

interface SubtaskListProps {
  tasks: MissionNode[];
  allNodes?: MissionNode[];
}

export function SubtaskList({ tasks, allNodes = [] }: SubtaskListProps) {
  const toggleTask = useToggleTask();
  const splitTask = useSplitTask();
  const mergeTask = useMergeTask();
  const rescheduleTask = useRescheduleTask();
  const deleteTask = useDeleteTask();

  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const getDependencyName = (depId: string): string => {
    return allNodes.find((n) => n.id === depId)?.name ?? depId;
  };

  return (
    <div className="space-y-1">
      {tasks.map((task, i) => {
        const isCompleted = task.status === "completed";
        const isBlocked = task.status === "blocked";

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: STAGGER.list * i, ...SPRING.gentle }}
            className={cn(
              "flex items-start gap-3 rounded-lg p-2.5 transition-colors relative",
              "hover:bg-white/[0.03]",
              isBlocked && "opacity-60"
            )}
            onMouseEnter={() => setHoveredTask(task.id)}
            onMouseLeave={() => setHoveredTask(null)}
          >
            {/* Checkbox */}
            <button
              onClick={() => {
                if (!isBlocked) toggleTask.mutate(task.id);
              }}
              disabled={isBlocked}
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                isCompleted
                  ? "border-emerald-500 bg-emerald-500/20"
                  : isBlocked
                    ? "border-zinc-600 cursor-not-allowed"
                    : "border-white/20 hover:border-white/40"
              )}
            >
              {isCompleted && <Check size={12} className="text-emerald-400" />}
              {isBlocked && <Lock size={10} className="text-zinc-500" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <span
                className={cn(
                  "text-sm text-foreground",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {task.name}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  variant={
                    isCompleted
                      ? "success"
                      : isBlocked
                        ? "neutral"
                        : task.status === "in-progress"
                          ? "info"
                          : "neutral"
                  }
                >
                  {task.status}
                </StatusBadge>
                {task.priority && (
                  <StatusBadge
                    variant={
                      task.priority === "critical"
                        ? "danger"
                        : task.priority === "high"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {task.priority}
                  </StatusBadge>
                )}
                {task.category && (
                  <StatusBadge variant="info">
                    {task.category}
                  </StatusBadge>
                )}
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock size={10} />
                  {task.estimatedHours}h
                </span>
                {task.scheduledStart && (
                  <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                    <CalendarClock size={10} />
                    {new Date(task.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {isBlocked && task.dependencies.length > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Lock size={9} />
                    Blocked by: {getDependencyName(task.dependencies[0])}
                  </span>
                )}
              </div>
            </div>

            {/* Completion badge & Actions */}
            <div className="flex items-center gap-2">
              {!isCompleted && !isBlocked && task.completionPercentage > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
                  {task.completionPercentage}%
                </span>
              )}

              <AnimatePresence>
                {hoveredTask === task.id && (
                  <motion.div
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    className="flex items-center gap-1 bg-white/10 p-1 rounded-md border border-white/10"
                  >
                    <button onClick={() => splitTask.mutate(task.id)} className="p-1 hover:bg-white/20 rounded text-muted-foreground hover:text-white" title="Auto-Split">
                      <Scissors size={12} />
                    </button>
                    <button onClick={() => mergeTask.mutate(task.id)} className="p-1 hover:bg-white/20 rounded text-muted-foreground hover:text-white" title="Auto-Merge">
                      <Combine size={12} />
                    </button>
                    <button onClick={() => rescheduleTask.mutate(task.id)} className="p-1 hover:bg-white/20 rounded text-muted-foreground hover:text-white" title="Reschedule">
                      <CalendarClock size={12} />
                    </button>
                    <button onClick={() => deleteTask.mutate(task.id)} className="p-1 hover:bg-rose-500/20 rounded text-muted-foreground hover:text-rose-400" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
