// =============================================================================
// Kairos One — Mission Hooks (TanStack Query)
// Data fetching hooks for missions with caching and optimistic updates.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMissions,
  getAllMissionNodes,
  getMissionById,
  getMissionGraph,
  createMission,
  toggleTaskComplete,
  splitMissionTask,
  mergeMissionTask,
  rescheduleMissionTask,
  deleteMissionTask,
  updateMissionNode,
} from "@/services/api";
import { useMissionStore } from "@/stores/mission-store";
import { useUIStore } from "@/stores/ui-store";
import type { CreateMissionInput, MissionNode } from "@/types";

export function useMissions() {
  const setMissions = useMissionStore((s) => s.setMissions);

  return useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const missions = await getMissions();
      setMissions(missions);
      return missions;
    },
    staleTime: 30_000,
  });
}

export function useAllMissionNodes() {
  return useQuery({
    queryKey: ["mission-nodes"],
    queryFn: getAllMissionNodes,
    staleTime: 30_000,
  });
}

export function useMission(id: string | null) {
  return useQuery({
    queryKey: ["mission", id],
    queryFn: () => (id ? getMissionById(id) : null),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useMissionGraphData(missionId: string | null) {
  return useQuery({
    queryKey: ["mission-graph", missionId],
    queryFn: () => (missionId ? getMissionGraph(missionId) : []),
    enabled: !!missionId,
    staleTime: 30_000,
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  const addMission = useMissionStore((s) => s.addMission);
  const addToast = useUIStore((s) => s.addToast);
  const closeCreate = useUIStore((s) => s.closeCreateMission);

  return useMutation({
    mutationFn: (input: CreateMissionInput) => createMission(input),
    onSuccess: (newMission) => {
      addMission(newMission);
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      closeCreate();
      addToast({
        title: "Mission created",
        description: `"${newMission.name}" is being analyzed by Sentinel.`,
        variant: "success",
      });
    },
    onError: () => {
      addToast({
        title: "Failed to create mission",
        description: "Please try again.",
        variant: "error",
      });
    },
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  const toggleTask = useMissionStore((s) => s.toggleTask);
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (taskId: string) => toggleTaskComplete(taskId),
    onMutate: (taskId: string) => {
      // Optimistic update
      toggleTask(taskId);
    },
    onSuccess: (result: MissionNode | null) => {
      if (result?.status === "completed") {
        addToast({
          title: "Task completed",
          description: result.name,
          variant: "success",
          duration: 2000,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: (_err: unknown, taskId: string) => {
      // Revert optimistic update
      toggleTask(taskId);
      addToast({
        title: "Failed to update task",
        variant: "error",
      });
    },
  });
}

export function useSplitTask() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (taskId: string) => splitMissionTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["mission-graph"] });
      addToast({ title: "Task split successfully", variant: "success", duration: 2000 });
    },
  });
}

export function useMergeTask() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (taskId: string) => mergeMissionTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["mission-graph"] });
      addToast({ title: "Task merged successfully", variant: "success", duration: 2000 });
    },
  });
}

export function useRescheduleTask() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (taskId: string) => rescheduleMissionTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      addToast({ title: "Task rescheduled", variant: "success", duration: 2000 });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (taskId: string) => deleteMissionTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["mission-graph"] });
      addToast({ title: "Task deleted", variant: "default", duration: 2000 });
    },
  });
}

export function useRenameMission() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await updateMissionNode(id, { name });
      if (!result) throw new Error("Update failed");
      return result;
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["mission", id] });
      await queryClient.cancelQueries({ queryKey: ["missions"] });
      
      const previousMission = queryClient.getQueryData(["mission", id]);
      
      if (previousMission) {
        queryClient.setQueryData(["mission", id], {
          ...previousMission,
          name,
        });
      }
      
      return { previousMission, id };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousMission) {
        queryClient.setQueryData(["mission", context.id], context.previousMission);
      }
      addToast({ title: "Failed to rename mission", variant: "error", duration: 2000 });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
    },
    onSuccess: () => {
      addToast({ title: "Mission renamed", variant: "success", duration: 2000 });
    },
  });
}

export function useChangeDeadline() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: async ({ id, deadline }: { id: string; deadline: string }) => {
      const result = await updateMissionNode(id, { deadline });
      if (!result) throw new Error("Update failed");
      return result;
    },
    onMutate: async ({ id, deadline }) => {
      await queryClient.cancelQueries({ queryKey: ["mission", id] });
      await queryClient.cancelQueries({ queryKey: ["missions"] });
      
      const previousMission = queryClient.getQueryData(["mission", id]);
      
      if (previousMission) {
        queryClient.setQueryData(["mission", id], {
          ...previousMission,
          deadline,
        });
      }
      
      return { previousMission, id };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousMission) {
        queryClient.setQueryData(["mission", context.id], context.previousMission);
      }
      addToast({ title: "Failed to change deadline", variant: "error", duration: 2000 });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["mission"] });
      queryClient.invalidateQueries({ queryKey: ["mission-nodes"] });
    },
    onSuccess: () => {
      addToast({ title: "Deadline updated", variant: "success", duration: 2000 });
    },
  });
}

