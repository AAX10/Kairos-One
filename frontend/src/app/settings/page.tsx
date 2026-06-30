"use client";

import { useEffect, useState } from "react";
import { useAuthStore, UserSettings } from "@/stores/auth-store";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { getUserProfile, updateUserProfile } from "@/services/api";

export default function SettingsPage() {
  const { uid, settings, updateSettings } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  
  const [formData, setFormData] = useState<UserSettings>({
    working_hours_start: "09:00",
    working_hours_end: "17:00",
    deep_work_duration_minutes: 120,
    break_duration_minutes: 15,
    calendar_sync_interval_minutes: 15,
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["deep_work_duration_minutes", "break_duration_minutes", "calendar_sync_interval_minutes"].includes(name) 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleSave = async () => {
    if (!uid) return;
    setIsSaving(true);
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        // Update user
        const updated = await updateUserProfile(uid, {
          ...profile,
          settings: formData
        });

        if (updated) {
          updateSettings(formData);
          addToast({
            title: "Settings Saved",
            description: "Your preferences have been updated.",
            variant: "success"
          });
        }
      }
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your Agent OS preferences.</p>
        </div>

        <div className="space-y-6">
          {/* Working Hours */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Working Hours</h3>
              <p className="text-sm text-muted-foreground">The Scheduler Agent will respect these boundaries.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Start Time</label>
                <input
                  type="time"
                  name="working_hours_start"
                  value={formData.working_hours_start}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">End Time</label>
                <input
                  type="time"
                  name="working_hours_end"
                  value={formData.working_hours_end}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Work Patterns */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Work Patterns</h3>
              <p className="text-sm text-muted-foreground">Optimize your deep work and recovery blocks.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Deep Work Duration (mins)</label>
                <input
                  type="number"
                  name="deep_work_duration_minutes"
                  value={formData.deep_work_duration_minutes}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Break Duration (mins)</label>
                <input
                  type="number"
                  name="break_duration_minutes"
                  value={formData.break_duration_minutes}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* System */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">System</h3>
              <p className="text-sm text-muted-foreground">General settings for Kairos One.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Time Zone</label>
              <input
                type="text"
                name="time_zone"
                value={formData.time_zone}
                disabled
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Automatically detected from browser.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || !uid}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

