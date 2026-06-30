"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { X, ChevronLeft, ChevronRight, RefreshCw, Calendar, List, MapPin, Users, AlignLeft } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useTimeline } from "@/hooks/use-dashboard";
import { refreshCalendar } from "@/services/api";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fadeInUp, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

type ViewMode = "day" | "week" | "agenda";

export function CalendarPanel() {
  const expanded = useUIStore((s) => s.calendarExpanded);
  const toggle = useUIStore((s) => s.toggleCalendar);
  const { data: blocks, isLoading, isError } = useTimeline();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<ViewMode>("week");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [baseDate, setBaseDate] = useState(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCalendar();
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    } catch (e) {

    } finally {
      setIsRefreshing(false);
    }
  };

  const nextPeriod = () => setBaseDate(addDays(baseDate, view === "week" ? 7 : 1));
  const prevPeriod = () => setBaseDate(addDays(baseDate, view === "week" ? -7 : -1));
  const goToday = () => setBaseDate(new Date());

  const days = view === "week" 
    ? Array.from({ length: 7 }, (_, i) => addDays(baseDate, i))
    : [baseDate];

  return (
    <AnimatePresence>
      {expanded && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
            onClick={toggle}
          />
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING.default}
            className="fixed inset-x-4 top-20 bottom-4 z-40 lg:inset-x-20 lg:top-16 lg:bottom-8"
          >
            <GlassCard className="h-full flex flex-col !p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-white/[0.03] rounded-md p-1 border border-white/[0.05]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 px-3 text-xs", view === "day" && "bg-white/[0.1]")}
                      onClick={() => setView("day")}
                    >
                      Day
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 px-3 text-xs", view === "week" && "bg-white/[0.1]")}
                      onClick={() => setView("week")}
                    >
                      Week
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 px-3 text-xs", view === "agenda" && "bg-white/[0.1]")}
                      onClick={() => setView("agenda")}
                    >
                      <List size={14} className="mr-1.5" /> Agenda
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={prevPeriod}>
                      <ChevronLeft size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToday} className="h-7 text-xs">
                      Today
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={nextPeriod}>
                      <ChevronRight size={16} />
                    </Button>
                    <h2 className="text-sm font-semibold ml-2 w-32">
                      {format(baseDate, view === "day" ? "MMMM d, yyyy" : "MMMM yyyy")}
                    </h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon-sm" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={toggle}>
                    <X size={16} />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto relative">
                {isLoading && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw size={24} className="animate-spin text-indigo-400" />
                      <p className="text-sm text-muted-foreground">Loading calendar data...</p>
                    </div>
                  </div>
                )}
                
                {isError && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm gap-3">
                    <p className="text-red-400">Failed to load calendar events.</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>Try Again</Button>
                  </div>
                )}
                
                {!isLoading && !isError && blocks?.length === 0 && (
                  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <Calendar size={48} className="text-white/10 mb-4" />
                    <p className="text-muted-foreground">No events scheduled.</p>
                  </div>
                )}

                {view === "agenda" ? (
                  <div className="p-6 max-w-2xl mx-auto">
                    {blocks?.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(block => (
                      <div key={block.id} className="flex gap-4 mb-6 border-b border-white/[0.05] pb-4">
                        <div className="w-16 flex flex-col items-end shrink-0 pt-1">
                          <span className="text-sm font-medium">{format(new Date(block.start), "h:mm a")}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(block.start), "MMM d")}</span>
                        </div>
                        <div 
                          className="flex-1 p-3 rounded-lg border bg-white/[0.02]"
                          style={{ borderColor: `${block.color}30` }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: block.color }} />
                            <span className="text-sm font-semibold">{block.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(block.start), "h:mm a")} - {format(new Date(block.end), "h:mm a")}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05]">
                              {block.type.replace("-", " ")}
                            </span>
                            <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05]">
                              {block.status}
                            </span>
                          </div>
                          {(block.location || block.organizer || block.description) && (
                            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.05]">
                              {block.location && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <MapPin size={12} className="mt-0.5 shrink-0" />
                                  <span className="leading-tight">{block.location}</span>
                                </div>
                              )}
                              {block.organizer && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <Users size={12} className="mt-0.5 shrink-0" />
                                  <span className="leading-tight">{block.organizer}</span>
                                </div>
                              )}
                              {block.description && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <AlignLeft size={12} className="mt-0.5 shrink-0" />
                                  <span className="leading-tight line-clamp-2" title={block.description}>{block.description}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn("grid min-w-[700px]", view === "week" ? "grid-cols-8" : "grid-cols-2")}>
                    {/* Time column header */}
                    <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-white/[0.06] px-2 py-2" />

                    {/* Day column headers */}
                    {days.map((day, i) => {
                      const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-white/[0.06] px-2 py-2 text-center",
                            isToday && "bg-indigo-500/5"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[10px] uppercase tracking-wider",
                              isToday
                                ? "text-indigo-400 font-semibold"
                                : "text-muted-foreground/60"
                            )}
                          >
                            {format(day, "EEE")}
                          </span>
                          <span
                            className={cn(
                              "block text-sm font-medium mt-0.5",
                              isToday ? "text-indigo-400" : "text-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                        </div>
                      );
                    })}

                    {/* Hour rows */}
                    {HOURS.map((hour) => (
                      <div key={hour} className="contents">
                        {/* Time label */}
                        <div className="border-b border-white/[0.03] px-2 py-0 h-14 flex items-start pt-1">
                          <span className="text-[10px] tabular-nums text-muted-foreground/40">
                            {hour <= 12
                              ? `${hour} AM`
                              : `${hour - 12} PM`}
                          </span>
                        </div>
                        {/* Day cells */}
                        {days.map((day, dayIdx) => {
                          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                          // Find blocks for this cell
                          const cellBlocks = blocks
                            ? blocks.filter((b) => {
                                const bDate = new Date(b.start);
                                return format(bDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd") && bDate.getHours() === hour;
                              })
                            : [];

                          return (
                            <div
                              key={days[dayIdx].toISOString()}
                              className={cn(
                                "border-b border-l border-white/[0.03] h-14 relative",
                                isToday && "bg-indigo-500/[0.02]"
                              )}
                            >
                              <div className="absolute inset-0 p-0.5 flex flex-row gap-0.5 overflow-hidden">
                                {cellBlocks.map((block) => (
                                  <div
                                    key={block.id}
                                    className="flex-1 rounded-md px-1 p-0.5 border text-[10px] min-w-0"
                                    style={{
                                      backgroundColor: `${block.color}15`,
                                      borderColor: `${block.color}30`,
                                      color: block.color,
                                    }}
                                  >
                                    <span className="font-medium truncate block leading-tight">
                                      {block.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
