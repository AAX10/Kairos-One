"use client";

import { format } from "date-fns";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeBlock } from "@/types";

interface TimeBlockCardProps {
  block: TimeBlock;
}

export function TimeBlockCard({ block }: TimeBlockCardProps) {
  const isCompleted = block.status === "completed";
  const isMissed = block.status === "missed";

  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-1.5 border cursor-pointer transition-colors",
        isMissed && "opacity-40 line-through",
        isCompleted && "opacity-70"
      )}
      style={{
        backgroundColor: `${block.color}15`,
        borderColor: `${block.color}30`,
      }}
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
      <span className="text-[10px] text-muted-foreground">
        {format(new Date(block.start), "h:mm")} –{" "}
        {format(new Date(block.end), "h:mm a")}
      </span>
    </div>
  );
}
