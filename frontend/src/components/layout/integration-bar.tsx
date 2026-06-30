"use client";

import { Calendar, Mail, HardDrive, Sparkles, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntegrations } from "@/hooks/use-dashboard";
import type { IntegrationService } from "@/types";

const INTEGRATION_ICONS: Record<IntegrationService, typeof Calendar> = {
  calendar: Calendar,
  gmail: Mail,
  drive: HardDrive,
  gemini: Sparkles,
  firebase: Database,
};

const INTEGRATION_LABELS: Record<IntegrationService, string> = {
  calendar: "Calendar",
  gmail: "Gmail",
  drive: "Drive",
  gemini: "Gemini",
  firebase: "Firebase",
};

interface IntegrationBarProps {
  collapsed?: boolean;
}

export function IntegrationBar({ collapsed = false }: IntegrationBarProps) {
  const { data: integrations } = useIntegrations();

  if (!integrations) return null;

  return (
    <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
      {!collapsed && (
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
          Google Integrations
        </p>
      )}
      <div
        className={cn(
          "flex gap-1",
          collapsed ? "flex-col items-center" : "flex-wrap"
        )}
      >
        {integrations.map((integration) => {
          const Icon = INTEGRATION_ICONS[integration.service];
          const isActive =
            integration.status === "connected" ||
            integration.status === "syncing" ||
            integration.status === "analyzing";

          return (
            <div
              key={integration.service}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors",
                collapsed
                  ? "justify-center"
                  : "hover:bg-white/5"
              )}
              title={`${INTEGRATION_LABELS[integration.service]}: ${integration.detail}`}
            >
              <div className="relative">
                <Icon
                  size={collapsed ? 16 : 13}
                  className={cn(
                    "transition-colors",
                    isActive
                      ? "text-emerald-400"
                      : "text-muted-foreground/40"
                  )}
                />
                {/* Status dot */}
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 block h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-emerald-400" : "bg-zinc-600",
                    (integration.status === "syncing" ||
                      integration.status === "analyzing") &&
                      "animate-pulse-dot"
                  )}
                />
              </div>
              {!collapsed && (
                <span className="text-[11px] text-muted-foreground">
                  {INTEGRATION_LABELS[integration.service]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
