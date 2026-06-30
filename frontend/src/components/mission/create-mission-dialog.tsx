"use client";

import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores/ui-store";
import { useCreateMission } from "@/hooks/use-missions";
import { useAgentPipeline } from "@/hooks/use-agent-pipeline";
import { Sparkles } from "lucide-react";

const createMissionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(5, "Describe the mission in more detail"),
  deadline: z.string().min(1, "Deadline is required"),
  priority: z.enum(["critical", "high", "medium", "low"]),
  estimatedHours: z.number().min(0.5, "Must be at least 0.5 hours").max(1000),
});

type CreateMissionForm = z.infer<typeof createMissionSchema>;

export function CreateMissionDialog() {
  const isOpen = useUIStore((s) => s.createMissionOpen);
  const close = useUIStore((s) => s.closeCreateMission);
  const createMission = useCreateMission();
  const { runPipeline, isRunning } = useAgentPipeline();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMissionForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createMissionSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      deadline: "",
      priority: "high",
      estimatedHours: 8,
    },
  });

  const onSubmit = async (data: CreateMissionForm) => {
    try {
      const createdMission = await createMission.mutateAsync(data);
      // Trigger pipeline animation for the new mission
      await runPipeline(`Analyzing "${data.name}" requirements...`, createdMission.id);
      
      // Refresh the dashboard data now that the pipeline is complete
      queryClient.invalidateQueries({ queryKey: ["dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      
      reset();
      close();
    } catch (error) {

    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/[0.08]">
        <DialogHeader>
          <DialogTitle>Create Mission</DialogTitle>
          <DialogDescription>
            Define your commitment. Kairos One will analyze it and create an execution plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Mission Name
            </label>
            <Input
              {...register("name")}
              placeholder="e.g., Complete Machine Learning Course"
              className="bg-white/[0.04] border-white/[0.08]"
            />
            {errors.name && (
              <p className="text-[11px] text-rose-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Description
            </label>
            <Input
              {...register("description")}
              placeholder="What does success look like?"
              className="bg-white/[0.04] border-white/[0.08]"
            />
            {errors.description && (
              <p className="text-[11px] text-rose-400">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Deadline
              </label>
              <Input
                {...register("deadline")}
                type="date"
                className="bg-white/[0.04] border-white/[0.08]"
              />
              {errors.deadline && (
                <p className="text-[11px] text-rose-400">
                  {errors.deadline.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Estimated Hours
              </label>
              <Input
                {...register("estimatedHours", { valueAsNumber: true })}
                type="number"
                step="0.5"
                className="bg-white/[0.04] border-white/[0.08]"
              />
              {errors.estimatedHours && (
                <p className="text-[11px] text-rose-400">
                  {errors.estimatedHours.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Priority
            </label>
            <select
              {...register("priority")}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Kairos One note */}
          <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/15 p-3">
            <Sparkles size={14} className="text-indigo-400 shrink-0" />
            <p className="text-[11px] text-indigo-300/80">
              Kairos One will analyze this mission, create subtasks with dependencies, schedule optimal work blocks, and calculate your completion probability.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createMission.isPending || isRunning}
              className="w-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/20"
            >
              {createMission.isPending || isRunning ? (
                "Analyzing..."
              ) : (
                <>
                  <Sparkles size={14} />
                  Create & Analyze
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

