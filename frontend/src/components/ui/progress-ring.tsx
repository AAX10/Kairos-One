"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
}

function getColorForValue(value: number): string {
  if (value >= 80) return "var(--kairos-emerald)";
  if (value >= 50) return "var(--kairos-amber)";
  return "var(--kairos-rose)";
}

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = false,
  color,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const resolvedColor = color ?? getColorForValue(value);

  const motionValue = useMotionValue(0);
  const dashOffset = useTransform(
    motionValue,
    [0, 100],
    [circumference, 0]
  );

  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      type: "spring",
      stiffness: 100,
      damping: 30,
      mass: 1,
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeLinecap={value < 5 || value > 95 ? "butt" : "round"}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold tabular-nums">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

