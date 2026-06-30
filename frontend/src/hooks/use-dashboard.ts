// =============================================================================
// Kairos One — Dashboard Hooks (TanStack Query)
// Data fetching for all Mission Control panels.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardData,
  getTimeline,
  getAgentPipelineStatus,
  getTodayEvents,
  getWeekEvents,
  refreshCalendar,
} from "@/services/api";
import { useMissionStore } from "@/stores/mission-store";
import { useAgentStore } from "@/stores/agent-store";

export function useDashboardData() {
  const setSuccess = useMissionStore((s) => s.setMissionSuccess);
  const setActivities = useAgentStore((s) => s.setActivities);

  return useQuery({
    queryKey: ["dashboard-unified"],
    queryFn: async () => {
      const data = await getDashboardData();
      setSuccess(data.missionSuccess);
      setActivities(data.agentActivities);
      return data;
    },
    staleTime: 60_000,
  });
}

// -----------------------------------------------------------------------------
// Derivative hooks for individual components
// These no longer trigger separate API calls. They just read from the unified cache.
// -----------------------------------------------------------------------------

export function useMissionSuccess() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.missionSuccess, isLoading, isError, refetch };
}

export function useDayBrief() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.dayBrief, isLoading, isError, refetch };
}

export function useRecommendations() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.recommendations, isLoading, isError, refetch };
}

export function useAgentActivities() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.agentActivities, isLoading, isError, refetch };
}

export function useCoachInsights() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.coachInsights, isLoading, isError, refetch };
}

export function useIntegrations() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.integrations, isLoading, isError, refetch };
}

export function useMemoryInsights() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  return { data: data?.memoryInsights || [], isLoading, isError, refetch };
}

// -----------------------------------------------------------------------------
// Other hooks (Timeline, Calendar, Mutations)
// -----------------------------------------------------------------------------

export function useTimeline(date?: string) {
  // Timeline can still be independently fetched if a specific date is requested, 
  // otherwise it defaults to today.
  return useQuery({
    queryKey: ["timeline", date ?? "today"],
    queryFn: () => getTimeline(date),
    staleTime: 30_000,
  });
}

export function useAcceptRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { acceptRecommendation } = await import("@/services/api");
      return acceptRecommendation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["agent-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { dismissRecommendation } = await import("@/services/api");
      return dismissRecommendation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
    },
  });
}

export function useAgentPipelineData() {
  const setPipeline = useAgentStore((s) => s.setPipeline);
  const isRunning = useAgentStore((s) => s.pipeline?.isRunning);

  return useQuery({
    queryKey: ["agent-pipeline"],
    queryFn: async () => {
      const response = await getAgentPipelineStatus();
      setPipeline(response.pipeline);
      return response.pipeline;
    },
    staleTime: 10_000,
    // Rely mostly on the manual poll in agent-store when running
    refetchInterval: false,
  });
}

export function useCalendarEvents(view: "today" | "week") {
  return useQuery({
    queryKey: ["calendar-events", view],
    queryFn: view === "today" ? getTodayEvents : getWeekEvents,
    staleTime: 300_000,
  });
}

export function useCalendarSync() {
  return useQuery({
    queryKey: ["calendar-sync"],
    queryFn: refreshCalendar,
    refetchInterval: 300_000, // Sync calendar only every 5 minutes
  });
}

