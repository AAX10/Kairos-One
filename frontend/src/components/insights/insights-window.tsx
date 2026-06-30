"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useUIStore } from "@/stores/ui-store";
import { useCoachInsights } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorState, EmptyState } from "@/components/ui/state-panels";
import { fadeInUp, SPRING } from "@/lib/motion";

const PRODUCTIVITY_DATA = [
  { day: "Mon", score: 72 },
  { day: "Tue", score: 78 },
  { day: "Wed", score: 68 },
  { day: "Thu", score: 85 },
  { day: "Fri", score: 81 },
  { day: "Sat", score: 74 },
  { day: "Sun", score: 84 },
];

const FOCUS_DATA = [
  { day: "Mon", focus: 4.5, fragmented: 2.0 },
  { day: "Tue", focus: 5.0, fragmented: 1.5 },
  { day: "Wed", focus: 3.0, fragmented: 3.5 },
  { day: "Thu", focus: 6.0, fragmented: 1.0 },
  { day: "Fri", focus: 5.5, fragmented: 1.5 },
  { day: "Sat", focus: 4.0, fragmented: 1.0 },
  { day: "Sun", focus: 5.0, fragmented: 2.0 },
];

export function InsightsWindow() {
  const isOpen = useUIStore((s) => s.insightsWindowOpen);
  const close = useUIStore((s) => s.setInsightsOpen);
  const { data: insights, isLoading, isError, refetch } = useCoachInsights();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => close(false)}
          />
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING.default}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-2xl max-h-[80vh]"
          >
            <GlassCard className="!p-0 overflow-hidden bg-background/95 backdrop-blur-xl border border-white/[0.08]">
              {/* Window chrome */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                    <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-semibold">Insights</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => close(false)}
                >
                  <X size={14} />
                </Button>
              </div>

              <div className="p-5 space-y-6 max-h-[calc(80vh-52px)] overflow-y-auto">
                {/* Productivity Trend */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Productivity Score (7 days)
                  </h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={PRODUCTIVITY_DATA}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[50, 100]}
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(20,20,30,0.95)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="var(--kairos-primary)"
                          strokeWidth={2}
                          dot={{ fill: "var(--kairos-primary)", r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Focus vs Fragmented */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Focus vs Fragmented Time (hours)
                  </h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={FOCUS_DATA}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(20,20,30,0.95)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Bar
                          dataKey="focus"
                          fill="var(--kairos-emerald)"
                          radius={[4, 4, 0, 0]}
                          opacity={0.8}
                        />
                        <Bar
                          dataKey="fragmented"
                          fill="var(--kairos-amber)"
                          radius={[4, 4, 0, 0]}
                          opacity={0.5}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Coach Insights */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Coach Insights
                  </h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <span className="text-xs text-muted-foreground animate-pulse">Analyzing performance...</span>
                    </div>
                  ) : isError ? (
                    <ErrorState title="Failed to load insights" onRetry={() => refetch()} />
                  ) : !insights || insights.length === 0 ? (
                    <EmptyState title="No Insights" message="Check back after completing some work." />
                  ) : (
                    <div className="space-y-2">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <Lightbulb
                              size={13}
                              className="text-emerald-400 shrink-0"
                            />
                            <span className="text-xs font-medium text-foreground">
                              {insight.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {insight.insight}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 italic">
                            Evidence: {insight.evidence}
                          </p>
                          <p className="text-[11px] text-emerald-400/80">
                            → {insight.actionable}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

