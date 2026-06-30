"use client";

import { motion } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState, EmptyState } from "@/components/ui/state-panels";
import { Button } from "@/components/ui/button";
import { useRecommendations, useAcceptRecommendation, useDismissRecommendation } from "@/hooks/use-dashboard";
import { useUIStore } from "@/stores/ui-store";
import { fadeInUp, SPRING, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function AIRecommendations() {
  const { data: recommendations, isLoading, isError, refetch } = useRecommendations();
  const acceptMut = useAcceptRecommendation();
  const dismissMut = useDismissRecommendation();
  const addToast = useUIStore((s) => s.addToast);

  if (isLoading) {
    return <SkeletonCard lines={4} />;
  }

  if (isError) {
    return (
      <GlassCard className="flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">AI Recommendations</h2>
        </div>
        <ErrorState title="Failed to load recommendations" onRetry={() => refetch()} />
      </GlassCard>
    );
  }



  const handleAction = async (
    recId: string,
    recTitle: string,
    actionType: "accept" | "dismiss" | "snooze"
  ) => {
    try {
      if (actionType === "accept") {
        await acceptMut.mutateAsync(recId);
        addToast({
          title: `Applied: ${recTitle}`,
          variant: "success",
          duration: 2000,
        });
      } else if (actionType === "dismiss") {
        await dismissMut.mutateAsync(recId);
        addToast({
          title: `Dismissed: ${recTitle}`,
          variant: "default",
          duration: 2000,
        });
      } else {
        addToast({
          title: `Snoozed: ${recTitle}`,
          variant: "default",
          duration: 2000,
        });
      }
    } catch (err) {
      addToast({
        title: "Failed to apply recommendation",
        variant: "error",
        duration: 3000,
      });
    }
  };

  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
          <Zap size={14} className="text-amber-400" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          AI Recommendations
        </h2>
      </div>

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {!recommendations || recommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 space-y-2.5 opacity-60 grayscale"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-foreground leading-snug">
                Optimization Monitoring Active
              </span>
              <div className="flex gap-1.5 shrink-0">
                <StatusBadge variant="neutral" className="shrink-0">
                  Standby
                </StatusBadge>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              AI agents are continuously analyzing your workflow. Actionable recommendations will appear here automatically when optimization opportunities are detected.
            </p>
          </motion.div>
        ) : (
          recommendations.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: STAGGER.cards * i, ...SPRING.gentle }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2.5"
            >
              {/* Title & Confidence */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-foreground leading-snug">
                  {rec.title}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <StatusBadge
                    variant={
                      rec.priority === "high" ? "danger" :
                        rec.priority === "medium" ? "warning" : "neutral"
                    }
                    className="shrink-0"
                  >
                    {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                  </StatusBadge>
                  <StatusBadge variant="info" className="shrink-0">
                    {rec.confidence}%
                  </StatusBadge>
                </div>
              </div>

              {/* Reason */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {rec.reason}
              </p>

              {/* Impact & Actions */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium",
                    rec.estimatedImpact > 0
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  <TrendingUp size={11} />
                  Mission Success {rec.estimatedImpact > 0 ? "+" : ""}
                  {rec.estimatedImpact}%
                </span>
                <div className="flex gap-1">
                  {rec.actions.map((action) => (
                    <Button
                      key={action.label}
                      variant={action.type === "accept" ? "default" : "ghost"}
                      size="xs"
                      onClick={() => handleAction(rec.id, rec.title, action.type)}
                      disabled={acceptMut.isPending || dismissMut.isPending}
                      className={cn(
                        action.type === "accept" &&
                        "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-indigo-500/20"
                      )}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
