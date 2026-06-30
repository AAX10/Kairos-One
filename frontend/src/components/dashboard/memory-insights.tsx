"use client";

import { motion } from "framer-motion";
import { BrainCircuit, TrendingUp, Clock, Lightbulb } from "lucide-react";
import { useMemoryInsights } from "@/hooks/use-dashboard";
import { fadeIn } from "@/lib/motion";
import { MemoryInsight } from "@/types";

const iconMap: Record<string, React.ReactNode> = {
  "trending-up": <TrendingUp className="w-5 h-5 text-indigo-400" />,
  "clock": <Clock className="w-5 h-5 text-emerald-400" />,
  "brain": <BrainCircuit className="w-5 h-5 text-amber-400" />,
  "lightbulb": <Lightbulb className="w-5 h-5 text-blue-400" />
};

export function MemoryInsights() {
  const { data: insights, isLoading } = useMemoryInsights();
  
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow h-48 animate-pulse" />
    );
  }

  const validInsights = insights || [];

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col h-full"
    >
      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
        <BrainCircuit className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-lg tracking-tight">AI Memory Engine</h3>
      </div>
      
      {validInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <p className="text-sm text-muted-foreground">
            No memories formed yet. Complete missions to train the engine.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 flex-1">
          {validInsights.map((insight: MemoryInsight) => (
            <div key={insight.id} className="flex gap-3 p-3 rounded-lg border bg-secondary/20">
              <div className="shrink-0 mt-0.5">
                {iconMap[insight.icon || "lightbulb"] || iconMap["lightbulb"]}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{insight.title}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {insight.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
