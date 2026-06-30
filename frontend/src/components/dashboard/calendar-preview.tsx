"use client";

import { motion } from "framer-motion";
import { CalendarDays, Expand } from "lucide-react";
import { format, addDays, isToday } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { useTimeline } from "@/hooks/use-dashboard";
import { useUIStore } from "@/stores/ui-store";
import { fadeInUp, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function CalendarPreview() {
  const { data: blocks } = useTimeline();
  const toggleCalendar = useUIStore((s) => s.toggleCalendar);

  // Generate 7 days from today
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(today, i);
    let hours = 0;

    if (blocks) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      hours = blocks.reduce((acc, b) => {
        const bStart = new Date(b.start);
        const bEnd = new Date(b.end);

        // Check if block overlaps with this day
        if (bStart <= endOfDay && bEnd >= startOfDay) {
          // Calculate overlap duration in hours
          const overlapStart = new Date(Math.max(bStart.getTime(), startOfDay.getTime()));
          const overlapEnd = new Date(Math.min(bEnd.getTime(), endOfDay.getTime()));
          return acc + (overlapEnd.getTime() - overlapStart.getTime()) / 3600000;
        }
        return acc;
      }, 0);
    }

    return { date, hours };
  });

  const maxHours = Math.max(...days.map((d) => d.hours), 1);

  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
            <CalendarDays size={14} className="text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">This Week</h2>
        </div>
        <button
          onClick={toggleCalendar}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Expand size={14} />
        </button>
      </div>

      <div className="flex items-end gap-2 h-24">
        {days.map((day, i) => {
          const barHeight = (day.hours / maxHours) * 100;
          const isCurrentDay = isToday(day.date);

          return (
            <div key={day.date.toISOString()} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Bar */}
              <div className="relative w-full h-16 flex items-end">
                <motion.div
                  className={cn(
                    "w-full rounded-t-md transition-colors",
                    isCurrentDay
                      ? "bg-gradient-to-t from-indigo-500/40 to-indigo-500/20"
                      : "bg-white/[0.06] hover:bg-white/[0.1]"
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeight}%` }}
                  transition={{ delay: 0.1 * i, ...SPRING.gentle }}
                />
                {isCurrentDay && (
                  <div className="absolute inset-0 rounded-t-md ring-1 ring-indigo-500/30 pointer-events-none" />
                )}
              </div>
              {/* Day label */}
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  isCurrentDay
                    ? "text-indigo-400 font-semibold"
                    : "text-muted-foreground/60"
                )}
              >
                {format(day.date, "EEE")}
              </span>
              {/* Hours */}
              <span className="text-[9px] text-muted-foreground/40 tabular-nums">
                {day.hours.toFixed(1)}h
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
