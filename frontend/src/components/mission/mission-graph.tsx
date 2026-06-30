import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Clock, AlertCircle } from "lucide-react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MissionNode } from "@/types";

interface MissionGraphProps {
  nodes: MissionNode[];
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
    case "in-progress": return "border-indigo-500/40 bg-indigo-500/10 text-indigo-100";
    case "blocked": return "border-zinc-500/40 bg-zinc-500/10 text-zinc-100";
    case "missed": return "border-rose-500/40 bg-rose-500/10 text-rose-100";
    default: return "border-white/10 bg-white/5 text-foreground";
  }
}

export function MissionGraph({ nodes }: MissionGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (nodes.length === 0) return null;

  // Build tree
  const nodeMap = new Map(nodes.map(n => [n.id, { ...n, childrenNodes: [] as MissionNode[] }]));
  const roots: MissionNode[] = [];

  for (const node of nodes) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.childrenNodes.push(nodeMap.get(node.id)!);
    } else {
      roots.push(nodeMap.get(node.id)!);
    }
  }

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  const renderNode = (node: MissionNode & { childrenNodes?: MissionNode[] }, level: number) => {
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.childrenNodes && node.childrenNodes.length > 0;

    return (
      <div key={node.id} className="relative flex flex-col gap-2 w-full">
        <motion.button
          onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.gentle}
          className={cn(
            "rounded-lg border px-3 py-2 text-left relative transition-colors flex items-center justify-between",
            getStatusColor(node.status),
            isSelected && "ring-2 ring-indigo-500/50",
            node.status === "blocked" && "opacity-60",
            node.criticalPath && "ring-1 ring-amber-500/30"
          )}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium leading-none">{node.name}</span>
              {node.criticalPath && (
                <span className="text-[8px] font-bold tracking-wider text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded uppercase">
                  Critical
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] tabular-nums text-muted-foreground/80">
                {node.completionPercentage}%
              </span>
              <span className="text-[9px] text-muted-foreground/80 flex items-center gap-0.5">
                <Clock size={8} /> {node.estimatedHours}h
              </span>
            </div>
          </div>
          {node.status === "blocked" && (
            <AlertCircle size={14} className="text-zinc-400" />
          )}
        </motion.button>

        {hasChildren && (
          <div className="flex flex-col gap-2 pl-4 border-l border-white/10 ml-2 relative">
            <div className="absolute top-0 -left-px w-2 h-px bg-white/10" />
            {node.childrenNodes!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Dependency Graph
        </p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Tree container */}
        <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {roots.map(root => renderNode(root, 0))}
        </div>

        {/* Details Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "200px" }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              transition={SPRING.gentle}
              className="shrink-0 overflow-hidden"
            >
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3 min-w-[200px]">
                <h4 className="text-xs font-semibold text-foreground truncate">{selectedNode.name}</h4>

                <div className="space-y-1 text-[11px]">
                  <span className="text-muted-foreground">Progress</span>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedNode.completionPercentage}%` }}
                      transition={SPRING.gentle}
                      className={cn("h-full rounded-full", getStatusColor(selectedNode.status).split(" ")[1])}
                    />
                  </div>
                  <span className="text-foreground">{selectedNode.completionPercentage}% Complete</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <span className="text-muted-foreground">Estimated Time</span>
                  <p className="text-foreground">{selectedNode.actualHours} / {selectedNode.estimatedHours} hours</p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <span className="text-muted-foreground">Status</span>
                  <p className="text-foreground capitalize">{selectedNode.status}</p>
                </div>

                {selectedNode.dependencies.length > 0 && (
                  <div className="space-y-1 text-[11px]">
                    <span className="text-muted-foreground">Dependencies</span>
                    <ul className="list-disc pl-3 text-foreground">
                      {selectedNode.dependencies.map(dep => {
                        const depNode = nodes.find(n => n.id === dep);
                        return <li key={dep}>{depNode ? depNode.name : dep}</li>;
                      })}
                    </ul>
                  </div>
                )}

                {selectedNode.status === "blocked" && (
                  <div className="space-y-1 text-[11px] text-zinc-400 bg-zinc-500/10 p-2 rounded border border-zinc-500/20">
                    <span className="font-semibold block">Blocked</span>
                    Dependencies must be completed first.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
