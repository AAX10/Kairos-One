"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import BorderGlow from "@/components/ui/BorderGlow";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "accent" | "danger" | "success";
  glow?: boolean;
  hoverable?: boolean;
  useBorderGlow?: boolean;
  noPadding?: boolean;
}

const glowMap: Record<string, string> = {
  default: "",
  accent: "glow-primary",
  danger: "glow-danger",
  success: "glow-success",
};

export function GlassCard({
  className,
  variant = "default",
  glow = false,
  hoverable = false,
  useBorderGlow = true,
  noPadding = false,
  children,
  ...props
}: GlassCardProps) {
  const innerClasses = cn(
    "glass w-full h-full rounded-2xl relative",
    glow && glowMap[variant]
  );

  return (
    <motion.div
      className={cn("relative", hoverable && "cursor-pointer", className)}
      whileHover={
        hoverable
          ? {
              scale: 1.02,
              transition: SPRING.default,
            }
          : undefined
      }
      {...props}
    >
      {useBorderGlow ? (
        <BorderGlow
          className="w-full h-full rounded-2xl"
          backgroundColor="transparent"
          borderRadius={16}
          colors={['#818cf8', '#c084fc', '#e879f9']}
        >
          <div className={cn(innerClasses, !noPadding && "p-5")}>{children as React.ReactNode}</div>
        </BorderGlow>
      ) : (
        <div className={cn(innerClasses, !noPadding && "p-5")}>{children as React.ReactNode}</div>
      )}
    </motion.div>
  );
}
