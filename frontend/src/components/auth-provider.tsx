"use client";

import { useEffect, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore, UserSettings } from "@/stores/auth-store";
import { getUserProfile, updateUserProfile } from "@/services/api";

const defaultSettings: UserSettings = {
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  deep_work_duration_minutes: 120,
  break_duration_minutes: 15,
  calendar_sync_interval_minutes: 15,
  time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Here we could also fetch the latest settings from our backend
        // GET /api/v1/users/{user.uid}
        
        let settings = defaultSettings;
        let isCalendarConnected = false;
        
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            settings = profile.settings || defaultSettings;
            isCalendarConnected = profile.calendar_connected || false;
          } else {
            // Create user
            await updateUserProfile(user.uid, {
              uid: user.uid,
              display_name: user.displayName || 'User',
              email: user.email || '',
              photo_url: user.photoURL || undefined,
              provider: user.providerData?.[0]?.providerId || 'google',
              calendar_connected: false,
              settings: defaultSettings
            });
          }
        } catch (error) {

        }

        setAuth({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          provider: user.providerData?.[0]?.providerId || "email",
          isCalendarConnected,
          settings
        });
      } else {
        setAuth({
          uid: null,
          displayName: null,
          email: null,
          photoURL: null,
          provider: null,
          isCalendarConnected: false,
          settings: null
        });
      }
    });

    return () => unsubscribe();
  }, [setAuth]);

  return <>{children}</>;
}
