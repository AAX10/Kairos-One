import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  showWaitMessage?: boolean;
}

export function SkeletonCard({ className, lines = 3, showWaitMessage }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 space-y-3 relative",
        className
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full animate-shimmer" />
        <div className="h-4 w-32 rounded animate-shimmer" />
      </div>
      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded animate-shimmer"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}

      {showWaitMessage && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-2xl border border-indigo-500/10">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mb-2" />
          <p className="text-sm font-medium text-foreground text-center px-4">
            Waking up server...
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1 px-4 max-w-[250px]">
            Please wait 20-30 seconds for the backend to spin up.
          </p>
        </div>
      )}
    </div>
  );
}
