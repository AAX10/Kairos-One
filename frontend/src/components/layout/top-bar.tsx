"use client";

import { format } from "date-fns";
import { AlertTriangle, Bell, User, LogIn, LogOut, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTriggerRecovery } from "@/hooks/use-recovery";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsDropdown } from "./notifications-dropdown";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";

export function TopBar() {
  const recovery = useTriggerRecovery();
  const { uid, displayName, email, photoURL, isCalendarConnected } = useAuthStore();
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const now = new Date();
  const hour = now.getHours();

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar");
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {

    }
  };

  const handleCalendarSync = useGoogleLogin({
    flow: "auth-code",
    scope: "https://www.googleapis.com/auth/calendar",
    // @ts-expect-error - prompt is passed to Google API but missing from type definitions
    prompt: "consent",
    onSuccess: async (codeResponse) => {
      try {
        const { authenticateCalendar } = await import("@/services/api");
        await authenticateCalendar(codeResponse.code);
        addToast({
          title: "Calendar Synced",
          description: "Your Google Calendar is successfully connected.",
          variant: "success",
        });
      } catch (error: any) {
        addToast({
          title: "Sync Failed",
          description: error.message || "Could not sync calendar.",
          variant: "error",
        });
      }
    },
    onError: (errorResponse) => {

      addToast({
        title: "Sync Failed",
        description: errorResponse.error_description || "Authentication failed.",
        variant: "error",
      });
    },
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {

    }
  };

  return (
    <header className="glass-heavy flex h-14 items-center justify-between border-b border-white/[0.06] px-6">
      {/* Left: Date & Greeting */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {greeting}
        </span>
        <span className="text-sm text-muted-foreground">
          {format(now, "EEEE, MMMM d")}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Subtle Recovery Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => recovery.mutate()}
          disabled={recovery.isPending}
          className={cn(
            "gap-2 rounded-full px-3 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10",
            "transition-all duration-200"
          )}
          title="Trigger recovery if you missed your schedule today"
        >
          <AlertTriangle size={14} />
          <span className="hidden sm:inline text-xs font-medium">
            {recovery.isPending ? "Recovering..." : "Missed Today"}
          </span>
        </Button>

        <NotificationsDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-semibold transition-transform hover:scale-105 overflow-hidden">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="uppercase">{displayName ? displayName.charAt(0) : <User size={16} />}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-heavy border-white/[0.06]">
            {uid ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{displayName || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem className="cursor-pointer hover:bg-white/[0.04]" onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-white/[0.04]" onClick={() => handleCalendarSync()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>{isCalendarConnected ? "Sync Calendar" : "Connect Calendar"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer hover:bg-white/[0.04] text-rose-400 focus:text-rose-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={handleSignIn} className="cursor-pointer hover:bg-white/[0.04]">
                <LogIn className="mr-2 h-4 w-4" />
                <span>Sign in with Google</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
