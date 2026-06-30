"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState, EmptyState } from "@/components/ui/state-panels";
import { useMissionSuccess } from "@/hooks/use-dashboard";
import { fadeInUp, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import TiltedCard from "@/components/ui/TiltedCard";

function getScoreColor(score: number): string {
  if (score >= 80) return "var(--kairos-emerald)";
  if (score >= 50) return "var(--kairos-amber)";
  return "var(--kairos-rose)";
}

function getGlowClass(score: number): string {
  if (score >= 80) return "glow-success";
  if (score >= 50) return "";
  return "glow-danger";
}

export function MissionGauge() {
  const { data: success, isLoading, isError, refetch } = useMissionSuccess();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return <SkeletonCard className="h-full min-h-[280px]" lines={4} />;
  }

  if (isError) {
    return (
      <GlassCard className="flex flex-col h-full items-center justify-center min-h-[280px]">
        <ErrorState title="Failed to calculate success" onRetry={() => refetch()} />
      </GlassCard>
    );
  }

  if (!success) {
    return (
      <GlassCard className="flex flex-col h-full items-center justify-center min-h-[280px]">
        <EmptyState title="No Data" message="Start a mission to see your success score." />
      </GlassCard>
    );
  }

  const size = 140;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(success.overallScore);
  const glowClass = getGlowClass(success.overallScore);

  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
      className={cn("h-full relative overflow-hidden")}
      useBorderGlow={false}
      noPadding={true}
    >
      <TiltedCard
        displayOverlayContent={true}
        showMobileWarning={false}
        showTooltip={false}
        scaleOnHover={1.03}
        rotateAmplitude={10}
        overlayContent={
          <div className="flex flex-col items-center justify-center p-6 relative w-full h-full">
            {/* Ambient glow behind gauge */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${color}15 0%, transparent 70%)`,
              }}
            />

            <div className="relative flex flex-col items-center gap-4">
              {/* Gauge SVG */}
              <div className={cn("relative", glowClass && glowClass)} style={{ borderRadius: "50%" }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                  {/* Background track */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-white/[0.06]"
                  />
                  {/* Animated progress arc */}
                  <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap={success.overallScore < 5 || success.overallScore > 95 ? "butt" : "round"}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{
                      strokeDashoffset:
                        circumference - (success.overallScore / 100) * circumference,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 60,
                      damping: 25,
                      mass: 1.5,
                      delay: 0.3,
                    }}
                  />
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Mission Success
                  </span>
                  <AnimatedNumber
                    value={success.overallScore}
                    suffix="%"
                    className="text-3xl font-bold"
                  />
                </div>
              </div>

              {/* Confidence, Delta, and Risk */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    <AnimatedNumber value={success.confidence} suffix="%" className="font-medium text-foreground" /> confidence
                  </span>
                  <StatusBadge
                    variant={success.trend === "up" ? "success" : success.trend === "down" ? "danger" : "neutral"}
                  >
                    {success.trend === "up" ? (
                      <TrendingUp size={11} />
                    ) : success.trend === "down" ? (
                      <TrendingDown size={11} />
                    ) : (
                      <Minus size={11} />
                    )}
                    {success.delta > 0 ? "+" : ""}
                    {success.delta}%
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle size={12} className={success.risk > 50 ? "text-rose-400" : "text-emerald-400"} />
                  <span>
                    <AnimatedNumber value={success.risk} suffix="%" className="font-medium text-foreground" /> risk
                  </span>
                </div>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Breakdown</span>
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={SPRING.default}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              {/* Expandable breakdown */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING.gentle}
                    className="w-full overflow-hidden"
                  >
                    <div className="space-y-3 pt-2">
                      {/* Per-mission scores */}
                      {success.perMissionScores.map((ms) => (
                        <div key={ms.missionId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground/80">{ms.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums font-medium">{ms.score}%</span>
                              <span
                                className={cn(
                                  "tabular-nums text-[11px]",
                                  ms.contribution > 0
                                    ? "text-emerald-400"
                                    : ms.contribution < 0
                                      ? "text-rose-400"
                                      : "text-muted-foreground"
                                )}
                              >
                                {ms.contribution > 0 ? "+" : ""}
                                {ms.contribution}%
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1 w-full rounded-full bg-white/[0.06]">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: getScoreColor(ms.score) }}
                              initial={{ width: 0 }}
                              animate={{ width: `${ms.score}%` }}
                              transition={SPRING.gentle}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Reasoning */}
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Reasoning
                        </p>
                        {success.reasoning.map((reason) => (
                          <p key={reason} className="text-xs text-muted-foreground leading-relaxed">
                            • {reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        }
      />
    </GlassCard>
  );
}

