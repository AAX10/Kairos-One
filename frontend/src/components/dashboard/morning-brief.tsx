"use client";

import { motion } from "framer-motion";
import { Sparkles, Target, AlertTriangle, BrainCircuit, Zap, Clock, Calendar } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState, EmptyState } from "@/components/ui/state-panels";
import { useDayBrief, useCalendarEvents, useCalendarSync, useIntegrations } from "@/hooks/use-dashboard";
import { fadeInUp, SPRING } from "@/lib/motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import { useGoogleLogin } from "@react-oauth/google";
import { authenticateCalendar, refreshCalendar } from "@/services/api";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/constants";

export function MorningBrief() {
  const { data: brief, isLoading, isError, refetch } = useDayBrief();
  const { data: todayEvents } = useCalendarEvents("today");
  useCalendarSync(); // Polling hook for background calendar refresh

  if (isLoading) {
    return <SkeletonCard className="col-span-full lg:col-span-1" lines={5} showWaitMessage={true} />;
  }

  if (isError) {
    return (
      <GlassCard className="col-span-full lg:col-span-1 flex flex-col items-center justify-center h-[280px]">
        <ErrorState title="Failed to load brief" onRetry={() => refetch()} />
      </GlassCard>
    );
  }

  if (!brief) {
    return (
      <GlassCard className="col-span-full lg:col-span-1 flex flex-col items-center justify-center h-[280px]">
        <EmptyState title="No Brief" message="Start a mission to generate a morning brief." />
      </GlassCard>
    );
  }

  const nextMeeting = todayEvents
    ? todayEvents.filter(e => new Date(e.start).getTime() > Date.now()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
    : null;

  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
      className="col-span-full lg:col-span-1 relative overflow-hidden flex flex-col gap-5"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />

      {/* Header & Greeting */}
      <div className="relative border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
            <Sparkles size={16} className="text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Kairos One Brief
          </h2>
        </div>
        <h3 className="text-lg font-medium text-foreground tracking-tight">
          {brief.greeting}
        </h3>
      </div>

      <div className="relative flex flex-col gap-4">
        {/* Focus & Critical */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
            <Target size={16} className="text-indigo-400 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Today's Focus</span>
              <span className="text-xs text-foreground/90 leading-snug">{brief.todaysFocus}</span>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
            <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Highest Risk</span>
              <span className="text-xs text-foreground/90 leading-snug">{brief.highestRisk}</span>
            </div>
          </div>
        </div>

        {/* Deep Work */}
        <div className="flex items-start gap-3 bg-emerald-500/[0.03] p-3 rounded-lg border border-emerald-500/[0.1]">
          <BrainCircuit size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-500/70">Deep Work Recommendation</span>
            <span className="text-xs text-emerald-100/90 leading-snug">{brief.deepWorkRecommendation}</span>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Productivity</span>
            </div>
            <span className="text-xs font-medium text-foreground">{brief.expectedProductivity}</span>
          </div>
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Est. Done</span>
            </div>
            <span className="text-xs font-medium text-foreground">{brief.completionEstimate}</span>
          </div>
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Deadlines</span>
            </div>
            <span className="text-xs font-medium text-foreground truncate" title={brief.upcomingDeadlines}>{brief.upcomingDeadlines}</span>
          </div>
        </div>

        {todayEvents && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center gap-3 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <Calendar size={14} className="text-violet-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Meetings Today</span>
                <span className="text-sm font-semibold text-foreground">{todayEvents.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Clock size={14} className="text-indigo-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Next Meeting</span>
                <span className="text-sm font-semibold text-foreground truncate" title={nextMeeting?.title}>
                  {nextMeeting ? nextMeeting.title : "None scheduled"}
                </span>
              </div>
            </div>
          </div>
        )}

        <CalendarAuthButton />
      </div>
    </GlassCard>
  );
}

function CalendarAuthButton() {
  const { data: integrations, refetch } = useIntegrations();
  const [loading, setLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const calIntegration = integrations?.find(i => i.service === "calendar");
  const isConnected = calIntegration?.status === "connected";

  const handleConnect = useGoogleLogin({
    flow: "auth-code",
    scope: GOOGLE_OAUTH_SCOPES,
    onSuccess: async (codeResponse) => {
      try {
        setLoading(true);
        await authenticateCalendar(codeResponse.code);
        await refreshCalendar(); // Automatically fetch Google events so cache is populated
        await refetch(); // Refreshes integration status
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }); // Trigger UI reload
        queryClient.invalidateQueries({ queryKey: ["timeline"] }); // Reload timeline
        addToast({
          title: "Calendar Connected",
          description: "Google Calendar has been synchronized.",
          variant: "success"
        });
      } catch (err: any) {
        addToast({
          title: "Auth Failed",
          description: err.message || "Failed to connect to Google Calendar.",
          variant: "error"
        });
      } finally {
        setLoading(false);
      }
    },
    onError: (errorResponse) => {
      addToast({
        title: "Auth Cancelled",
        description: "Failed to connect to Google Calendar.",
        variant: "error"
      });
    },
  });

  if (isConnected) return null;

  return (
    <button
      onClick={() => handleConnect()}
      disabled={loading}
      className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-colors border border-indigo-500/20 disabled:opacity-50"
    >
      <Calendar size={14} />
      {loading ? "Connecting..." : "Connect Google Calendar"}
    </button>
  );
}

