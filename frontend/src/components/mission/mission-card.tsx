"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { useUIStore } from "@/stores/ui-store";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MissionNode } from "@/types";

interface MissionCardProps {
  mission: MissionNode;
  index?: number;
}

const priorityVariant: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

export function MissionCard({ mission, index = 0 }: MissionCardProps) {
  const openDrawer = useUIStore((s) => s.openMissionDrawer);
  const isAtRisk = mission.contributionToSuccess < 0;

  return (
    <motion.button
      onClick={() => openDrawer(mission.id)}
      className={cn(
        "glass w-full rounded-xl p-4 text-left transition-all",
        "hover:bg-white/[0.06]",
        isAtRisk && "ring-1 ring-rose-500/20"
      )}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, ...SPRING.gentle }}
      whileHover={{ scale: 1.02, transition: SPRING.default }}
    >
      <div className="flex items-start gap-3">
        <ProgressRing
          value={mission.completionPercentage}
          size={44}
          strokeWidth={3.5}
          color={mission.color}
          showLabel
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {mission.name}
            </h3>
            {isAtRisk && (
              <AlertTriangle size={14} className="text-rose-400 shrink-0 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={priorityVariant[mission.priority]} >
              {mission.priority}
            </StatusBadge>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock size={10} />
              {formatDistanceToNow(new Date(mission.deadline), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {mission.children.length} tasks · {mission.estimatedHours}h est.
            </span>
            <span
              className={cn(
                "text-[11px] tabular-nums font-medium",
                mission.contributionToSuccess > 0
                  ? "text-emerald-400"
                  : mission.contributionToSuccess < 0
                    ? "text-rose-400"
                    : "text-muted-foreground"
              )}
            >
              {mission.contributionToSuccess > 0 ? "+" : ""}
              {mission.contributionToSuccess}%
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
