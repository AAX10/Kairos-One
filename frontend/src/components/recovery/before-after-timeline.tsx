"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { SPRING, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { TimeBlock } from "@/types";

interface BeforeAfterTimelineProps {
  before: TimeBlock[];
  after: TimeBlock[];
}

function MiniBlock({
  block,
  variant,
  index,
}: {
  block: TimeBlock;
  variant: "before" | "after";
  index: number;
}) {
  const isBefore = variant === "before";

  return (
    <motion.div
      initial={{ opacity: 0, x: isBefore ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: STAGGER.recovery + index * 0.08, ...SPRING.gentle }}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 border",
        isBefore
          ? "border-rose-500/20 bg-rose-500/5 line-through opacity-60"
          : "border-emerald-500/20 bg-emerald-500/5"
      )}
    >
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{
          backgroundColor: isBefore ? "#f87171" : block.color,
        }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-foreground truncate block">
          {block.title}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(block.start), "h:mm a")} –{" "}
          {format(new Date(block.end), "h:mm a")}
        </span>
      </div>
      {isBefore ? (
        <X size={12} className="text-rose-400 shrink-0" />
      ) : (
        <Check size={12} className="text-emerald-400 shrink-0" />
      )}
    </motion.div>
  );
}

export function BeforeAfterTimeline({
  before,
  after,
}: BeforeAfterTimelineProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Before */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">
          Original Schedule
        </p>
        <div className="space-y-1.5">
          {before
            .filter((b) => b.type !== "break")
            .map((block, i) => (
              <MiniBlock
                key={block.id}
                block={block}
                variant="before"
                index={i}
              />
            ))}
        </div>
      </div>

      {/* After */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
          Recovered Schedule
        </p>
        <div className="space-y-1.5">
          {after
            .filter((b) => b.type !== "break")
            .map((block, i) => (
              <MiniBlock
                key={block.id}
                block={block}
                variant="after"
                index={i}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
