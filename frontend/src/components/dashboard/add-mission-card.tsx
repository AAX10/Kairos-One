"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUIStore } from "@/stores/ui-store";
import { fadeInUp, SPRING } from "@/lib/motion";

export function AddMissionCard() {
  const openCreateMission = useUIStore((s) => s.openCreateMission);

  return (
    <GlassCard
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={SPRING.gentle}
      hoverable
      onClick={openCreateMission}
      className="col-span-full lg:col-span-1 flex flex-col items-center justify-center min-h-[280px] h-full group"
      style={{
        border: "2px dashed rgba(255, 255, 255, 0.1)"
      }}
    >
      <div className="h-16 w-16 rounded-full bg-white/[0.03] group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors mb-4 border border-white/[0.05] group-hover:border-indigo-500/30">
        <Plus size={32} className="text-muted-foreground group-hover:text-indigo-400 transition-colors" />
      </div>
      <span className="text-base font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
        Create New Mission
      </span>
      <span className="text-[11px] text-muted-foreground/60 mt-2 text-center max-w-[80%] leading-relaxed">
        Launch a new objective and let the AI agents break it down, schedule it, and evaluate risks.
      </span>
    </GlassCard>
  );
}
