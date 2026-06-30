import {
  Brain,
  CalendarDays,
  ShieldAlert,
  RotateCcw,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentType, AgentStatus } from "@/types";

interface AgentIconProps {
  agent: AgentType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  status?: AgentStatus;
  className?: string;
}

interface AgentMeta {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
}

const AGENT_META: Record<AgentType, AgentMeta> = {
  planner: {
    icon: Brain,
    label: "Planner",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/15",
  },
  scheduler: {
    icon: CalendarDays,
    label: "Scheduler",
    color: "text-violet-400",
    bgColor: "bg-violet-500/15",
  },
  risk: {
    icon: ShieldAlert,
    label: "Risk",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
  },
  recovery: {
    icon: RotateCcw,
    label: "Recovery",
    color: "text-rose-400",
    bgColor: "bg-rose-500/15",
  },
  coach: {
    icon: Lightbulb,
    label: "Coach",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
  },
};

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizeMap = {
  sm: 14,
  md: 16,
  lg: 20,
};

export function AgentIcon({
  agent,
  size = "md",
  showLabel = false,
  status,
  className,
}: AgentIconProps) {
  const meta = AGENT_META[agent];
  const Icon = meta.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center rounded-lg",
            sizeMap[size],
            meta.bgColor,
            status === "working" && "ring-2 ring-offset-1 ring-offset-background",
            status === "working" && agent === "planner" && "ring-indigo-400/60",
            status === "working" && agent === "scheduler" && "ring-violet-400/60",
            status === "working" && agent === "risk" && "ring-amber-400/60",
            status === "working" && agent === "recovery" && "ring-rose-400/60",
            status === "working" && agent === "coach" && "ring-emerald-400/60"
          )}
        >
          <Icon
            size={iconSizeMap[size]}
            className={cn(
              meta.color,
              status === "idle" && "opacity-40",
              status === "working" && "animate-pulse"
            )}
          />
        </div>
        {/* Status ring for working state */}
        {status === "working" && (
          <div className="absolute -inset-0.5 rounded-lg border-2 border-transparent">
            <div
              className={cn(
                "absolute inset-0 rounded-lg border-2 border-t-transparent animate-spin-ring",
                agent === "planner" && "border-indigo-400/60",
                agent === "scheduler" && "border-violet-400/60",
                agent === "risk" && "border-amber-400/60",
                agent === "recovery" && "border-rose-400/60",
                agent === "coach" && "border-emerald-400/60"
              )}
            />
          </div>
        )}
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-sm font-medium",
            status === "idle" ? "text-muted-foreground" : meta.color
          )}
        >
          {meta.label}
        </span>
      )}
    </div>
  );
}

export { AGENT_META };
