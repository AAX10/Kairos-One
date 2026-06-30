"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { format } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState, EmptyState } from "@/components/ui/state-panels";
import { useTimeline } from "@/hooks/use-dashboard";
import { fadeInUp, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { TimeBlock } from "@/types";

const HOUR_HEIGHT = 56; // px per hour
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function getBlockPosition(block: TimeBlock) {
  const start = new Date(block.start);
  const end = new Date(block.end);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = (startHour - START_HOUR) * HOUR_HEIGHT;
  const height = (endHour - startHour) * HOUR_HEIGHT;
  return { top, height: Math.max(height, 24) };
}

function getCurrentTimePosition(): number | null {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < START_HOUR || hour > END_HOUR) return null;
  return (hour - START_HOUR) * HOUR_HEIGHT;
}

export function Timeline() {
  const { data: blocks, isLoading, isError, refetch } = useTimeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimePos = getCurrentTimePosition();

  // Auto-scroll to current time
  useEffect(() => {
    if (scrollRef.current && currentTimePos !== null) {
      scrollRef.current.scrollTop = Math.max(0, currentTimePos - 100);
    }
  }, [currentTimePos]);

  // Compute layout for overlapping blocks
  const positionedBlocks = useMemo(() => {
    if (!blocks) return [];

    // 1. Explicitly filter for today's local date
    const now = new Date();
    const todayBlocks = blocks.filter((b) => {
      const bDate = new Date(b.start);
      return (
        bDate.getDate() === now.getDate() &&
        bDate.getMonth() === now.getMonth() &&
        bDate.getFullYear() === now.getFullYear()
      );
    });

    // 2. Sort and group for overlap layout
    const sorted = [...todayBlocks].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const layout: { block: TimeBlock; colIndex: number; maxCols: number }[] = [];

    let currentGroup: TimeBlock[] = [];
    let groupEnd = 0;

    const processGroup = (group: TimeBlock[]) => {
      const columns: TimeBlock[][] = [];
      for (const b of group) {
        let placed = false;
        const bStart = new Date(b.start).getTime();
        for (let i = 0; i < columns.length; i++) {
          const lastInCol = columns[i][columns[i].length - 1];
          if (new Date(lastInCol.end).getTime() <= bStart) {
            columns[i].push(b);
            placed = true;
            break;
          }
        }
        if (!placed) columns.push([b]);
      }

      const numCols = columns.length;
      for (let i = 0; i < columns.length; i++) {
        for (const b of columns[i]) {
          layout.push({ block: b, colIndex: i, maxCols: numCols });
        }
      }
    };

    for (const block of sorted) {
      const start = new Date(block.start).getTime();
      const end = new Date(block.end).getTime();
      if (currentGroup.length === 0) {
        currentGroup.push(block);
        groupEnd = end;
      } else if (start < groupEnd) {
        currentGroup.push(block);
        groupEnd = Math.max(groupEnd, end);
      } else {
        processGroup(currentGroup);
        currentGroup = [block];
        groupEnd = end;
      }
    }
    if (currentGroup.length > 0) {
      processGroup(currentGroup);
    }

    return layout;
  }, [blocks]);

  if (isLoading) {
    return <SkeletonCard lines={6} />;
  }

  if (isError) {
    return (
      <GlassCard className="flex flex-col h-[400px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Today&apos;s Timeline</h2>
        </div>
        <ErrorState title="Failed to load timeline" onRetry={() => refetch()} />
      </GlassCard>
    );
  }



  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
      className="flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Today&apos;s Timeline
        </h2>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock size={12} />
          {format(new Date(), "h:mm a")}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="relative overflow-y-auto max-h-[380px] pr-1"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          className="relative"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Hour lines */}
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
            const hour = START_HOUR + i;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-start"
                style={{ top: i * HOUR_HEIGHT }}
              >
                <span className="w-10 shrink-0 text-[10px] tabular-nums text-muted-foreground/50 -translate-y-1.5">
                  {hour === 0 ? "12 AM" : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
                </span>
                <div className="flex-1 border-t border-white/[0.04]" />
              </div>
            );
          })}

          {/* Time blocks */}
          {positionedBlocks.map(({ block, colIndex, maxCols }, i) => {
            const pos = getBlockPosition(block);
            const isMissed = block.status === "missed";
            const isCompleted = block.status === "completed";

            const widthPct = 100 / maxCols;
            const leftPct = (colIndex / maxCols) * 100;

            return (
              <motion.div
                layout
                key={block.id}
                className={cn(
                  "absolute rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer overflow-hidden",
                  isMissed && "opacity-40 line-through",
                  isCompleted && "opacity-70"
                )}
                style={{
                  backgroundColor: `${block.color}15`,
                  borderColor: `${block.color}30`,
                }}
                initial={{ opacity: 0, x: 10 }}
                animate={{
                  opacity: isMissed ? 0.4 : isCompleted ? 0.7 : 1,
                  x: 0,
                  top: pos.top + 2,
                  height: pos.height - 4,
                  width: `calc((100% - 3rem) * ${1 / maxCols} - 4px)`,
                  left: `calc(3rem + (100% - 3rem) * ${colIndex / maxCols})`
                }}
                transition={{ delay: 0.1 * i, ...SPRING.gentle }}
                whileHover={{ scale: 1.01, backgroundColor: `${block.color}25`, zIndex: 10 }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: block.color }}
                  >
                    {block.title}
                  </span>
                  {isCompleted && (
                    <Check size={12} className="text-emerald-400 shrink-0" />
                  )}
                </div>
                {pos.height > 36 && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(block.start), "h:mm")} –{" "}
                    {format(new Date(block.end), "h:mm a")}
                  </span>
                )}
                {pos.height > 50 && block.missionName && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {block.missionName}
                  </span>
                )}
              </motion.div>
            );
          })}

          {/* Current time indicator */}
          {currentTimePos !== null && (
            <div
              className="absolute left-10 right-0 z-10 flex items-center"
              style={{ top: currentTimePos }}
            >
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </div>
              <div className="flex-1 h-px bg-rose-500/70" />
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
