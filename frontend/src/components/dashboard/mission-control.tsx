"use client";

import { motion } from "framer-motion";
import { MorningBrief } from "./morning-brief";
import { MissionGauge } from "./mission-gauge";
import { AddMissionCard } from "./add-mission-card";
import { AgentPipeline } from "./agent-pipeline";
import { Timeline } from "./timeline";
import { AIRecommendations } from "./ai-recommendations";
import { CalendarPreview } from "./calendar-preview";
import { AIActivityFeed } from "./ai-activity-feed";
import { MemoryInsights } from "./memory-insights";
import { staggerContainer } from "@/lib/motion";

export function MissionControl() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-4 p-6 grid-cols-1 lg:grid-cols-3 auto-rows-min"
    >
      {/* Row 1: Morning Brief + Mission Success Gauge + Add Mission */}
      <MorningBrief />
      <MissionGauge />
      <AddMissionCard />

      {/* Row 2: Agent Pipeline (full width) */}
      <AgentPipeline />

      {/* Row 3: Timeline + AI Recommendations */}
      <Timeline />
      <AIRecommendations />

      {/* Row 4: Activity Feed + Calendar Preview + Memory Insights */}
      <AIActivityFeed />
      <CalendarPreview />
      <MemoryInsights />
    </motion.div>
  );
}
