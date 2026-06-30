"use client";

import { Sparkles } from "lucide-react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MissionDrawer } from "@/components/mission/mission-drawer";
import { CreateMissionDialog } from "@/components/mission/create-mission-dialog";
import { RecoveryOverlay } from "@/components/recovery/recovery-overlay";
import { AssistantPanel } from "@/components/ai/assistant-panel";
import { CalendarPanel } from "@/components/calendar/calendar-panel";
import { InsightsWindow } from "@/components/insights/insights-window";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "glass rounded-xl px-4 py-3 text-sm shadow-lg border animate-in slide-in-from-right-5 fade-in-0 cursor-pointer",
            toast.variant === "success" && "border-emerald-500/20 bg-emerald-500/10",
            toast.variant === "error" && "border-rose-500/20 bg-rose-500/10",
            toast.variant === "warning" && "border-amber-500/20 bg-amber-500/10",
            toast.variant === "default" && "border-white/[0.08]"
          )}
          onClick={() => removeToast(toast.id)}
        >
          <p className="font-medium text-foreground text-xs">{toast.title}</p>
          {toast.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {toast.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FloatingAssistantButton() {
  const toggleAssistant = useUIStore((s) => s.toggleAssistant);

  return (
    <button
      onClick={toggleAssistant}
      className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg animate-breathe transition-transform hover:scale-110"
      aria-label="Open AI Assistant"
    >
      <Sparkles size={20} />
    </button>
  );
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Overlay layers — rendered via zustand state */}
      <MissionDrawer />
      <CreateMissionDialog />
      <CalendarPanel />
      <InsightsWindow />
      <AssistantPanel />
      <RecoveryOverlay />

      {/* Floating elements */}
      <FloatingAssistantButton />
      <ToastContainer />
    </div>
  );
}
