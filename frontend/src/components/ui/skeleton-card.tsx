import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 space-y-3",
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
    </div>
  );
}
