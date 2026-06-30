"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { AgentIcon } from "@/components/ui/agent-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState, EmptyState } from "@/components/ui/state-panels";
import { useAgentActivities } from "@/hooks/use-dashboard";
import { useAgentStore } from "@/stores/agent-store";
import { fadeInUp, SPRING, STAGGER } from "@/lib/motion";
import type { AgentType } from "@/types";

export function AIActivityFeed() {
  const { isLoading, isError, refetch } = useAgentActivities(); // just to trigger the initial fetch
  const activities = useAgentStore((s) => s.activities);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // because it's newest first, we scroll to top
    }
  }, [activities]);

  if (isLoading && activities.length === 0) {
    return <SkeletonCard lines={5} />;
  }

  if (isError && activities.length === 0) {
    return (
      <GlassCard className="flex flex-col h-[340px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">AI Activity Feed</h2>
        </div>
        <ErrorState title="Failed to load activities" onRetry={() => refetch()} />
      </GlassCard>
    );
  }



  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
          <Activity size={14} className="text-indigo-400" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          AI Activity Feed
        </h2>
      </div>

      <div ref={scrollRef} className="space-y-0 max-h-[340px] overflow-y-auto pr-1 scroll-smooth">
        {!activities || activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full items-start gap-3 rounded-lg p-2 text-left opacity-60 grayscale"
          >
            <AgentIcon
              agent="planner"
              size="sm"
              status="idle"
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">
                  Agent Pipeline Idle
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge variant="neutral">
                  Standing By
                </StatusBadge>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">
                  Just now
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((activity, i) => {
              const isExpanded = expandedId === activity.id;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: STAGGER.list * i, ...SPRING.gentle }}
                  className="relative"
                >
                  {/* Connecting line */}
                  {i < activities.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-white/[0.06]" />
                  )}

                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : activity.id)
                    }
                    className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <AgentIcon
                      agent={activity.agent as AgentType}
                      size="sm"
                      status="finished"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {activity.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          variant={
                            activity.impact.includes("+") || activity.impact.includes("Created") || activity.impact.includes("Protected")
                              ? "success"
                              : activity.impact.includes("conflict") || activity.impact.includes("risk")
                                ? "warning"
                                : "info"
                          }
                        >
                          {activity.impact}
                        </StatusBadge>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={SPRING.default}
                      className="shrink-0 mt-1"
                    >
                      <ChevronDown
                        size={12}
                        className="text-muted-foreground/40"
                      />
                    </motion.div>
                  </button>

                  {/* Expandable reasoning */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING.gentle}
                        className="overflow-hidden"
                      >
                        <div className="ml-9 pb-2 pr-2">
                          <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.04]">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-1">
                              Reasoning
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {activity.reasoning}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </GlassCard>
  );
}
