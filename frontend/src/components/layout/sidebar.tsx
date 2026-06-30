"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Target,
  CalendarDays,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useMissions } from "@/hooks/use-missions";
import { IntegrationBar } from "./integration-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import ShinyText from "@/components/ui/ShinyText";
import Link from "next/link";

const NAV_ITEMS = [
  { id: "control" as const, label: "Mission Control", icon: LayoutDashboard },
  { id: "missions" as const, label: "Missions", icon: Target },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { id: "insights" as const, label: "Insights", icon: BarChart3 },
];

type NavId = (typeof NAV_ITEMS)[number]["id"];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleCalendar = useUIStore((s) => s.toggleCalendar);
  const toggleInsights = useUIStore((s) => s.toggleInsights);
  const openCreateMission = useUIStore((s) => s.openCreateMission);
  const openMissionDrawer = useUIStore((s) => s.openMissionDrawer);
  const { data: missions } = useMissions();

  const handleNavClick = (id: NavId) => {
    switch (id) {
      case "control":
        // Already on Mission Control — scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "missions":
        // Open the first mission drawer if available
        if (missions && missions.length > 0) {
          openMissionDrawer(missions[0].id);
        }
        break;
      case "calendar":
        toggleCalendar();
        break;
      case "insights":
        toggleInsights();
        break;
    }
  };

  return (
    <motion.aside
      className={cn(
        "glass-heavy flex h-screen flex-col border-r border-white/[0.06] transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
      layout
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center border-b border-white/[0.06] px-4 h-14",
          collapsed ? "justify-center" : "px-4"
        )}
      >
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <ShinyText text="Kairos One" speed={3} className="text-xl font-bold tracking-tight" />
            </motion.div>
          ) : (
            <ShinyText text="K1" speed={3} className="text-lg font-bold" />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 pt-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === "control";

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              )}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-3 h-px bg-white/[0.06]" />

        {/* Active Missions Quick List */}
        {!collapsed && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Active Missions
              </span>
              <button
                onClick={openCreateMission}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {missions?.map((mission) => (
              <button
                key={mission.id}
                onClick={() => openMissionDrawer(mission.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                <ProgressRing
                  value={mission.completionPercentage}
                  size={20}
                  strokeWidth={2.5}
                  color={mission.color}
                />
                <span className="truncate text-xs">{mission.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Integration Status */}
      <div className="border-t border-white/[0.06] py-3">
        <IntegrationBar collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-white/[0.06] p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </motion.aside>
  );
}

