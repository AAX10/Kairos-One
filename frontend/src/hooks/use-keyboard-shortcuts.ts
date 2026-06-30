// =============================================================================
// Kairos One — Keyboard Shortcuts Hook
// Global keyboard shortcut handler for the OS-like experience.
// =============================================================================

"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function useKeyboardShortcuts() {
  const toggleAssistant = useUIStore((s) => s.toggleAssistant);
  const openCreateMission = useUIStore((s) => s.openCreateMission);
  const closeTopmost = useUIStore((s) => s.closeTopmost);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+J or Ctrl+J — Toggle AI Assistant
      if (isMod && e.key === "j") {
        e.preventDefault();
        toggleAssistant();
        return;
      }

      // Cmd+N or Ctrl+N — New Mission
      if (isMod && e.key === "n") {
        e.preventDefault();
        openCreateMission();
        return;
      }

      // Escape — Close topmost overlay
      if (e.key === "Escape") {
        e.preventDefault();
        closeTopmost();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAssistant, openCreateMission, closeTopmost]);
}

