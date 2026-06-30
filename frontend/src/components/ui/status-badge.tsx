import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  pulse?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<StatusBadgeProps["variant"], string> = {
  success:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning:
    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  danger:
    "bg-rose-500/15 text-rose-400 border-rose-500/20",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  neutral:
    "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export function StatusBadge({
  variant,
  pulse = false,
  icon,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              variant === "success" && "bg-emerald-400",
              variant === "warning" && "bg-amber-400",
              variant === "danger" && "bg-rose-400",
              variant === "info" && "bg-blue-400",
              variant === "neutral" && "bg-zinc-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              variant === "success" && "bg-emerald-400",
              variant === "warning" && "bg-amber-400",
              variant === "danger" && "bg-rose-400",
              variant === "info" && "bg-blue-400",
              variant === "neutral" && "bg-zinc-400"
            )}
          />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
