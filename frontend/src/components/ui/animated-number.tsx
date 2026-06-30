"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className,
  decimals = 0,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) => {
    return `${prefix}${latest.toFixed(decimals)}${suffix}`;
  });

  const hasAnimated = useRef(false);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      type: "spring",
      stiffness: hasAnimated.current ? 150 : 80,
      damping: 30,
      mass: 1,
    });
    hasAnimated.current = true;
    return () => controls.stop();
  }, [value, motionValue]);

  return (
    <motion.span className={cn("tabular-nums", className)}>
      {display}
    </motion.span>
  );
}
