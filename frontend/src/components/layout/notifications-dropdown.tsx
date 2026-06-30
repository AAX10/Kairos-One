"use client";

import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Mission Completed",
      message: "You have successfully completed 'Project Alpha'.",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
    },
    {
      id: "2",
      title: "Recovery Mode Triggered",
      message: "The Recovery Agent has rescheduled your missed tasks.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: false,
    },
    {
      id: "3",
      title: "New AI Insight",
      message: "The Coach Agent noticed you're most productive in the mornings.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 glass-heavy border-white/[0.06] p-0">
        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
          <DropdownMenuLabel className="p-0 font-medium text-sm">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
            <button 
              onClick={clearAll} 
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              You have no notifications.
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={cn(
                  "p-3 border-b border-white/[0.03] last:border-0 cursor-pointer transition-colors hover:bg-white/[0.02]",
                  !notification.read ? "bg-indigo-500/[0.03]" : ""
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={cn(
                    "text-xs font-medium",
                    !notification.read ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {notification.title}
                  </h4>
                  <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap ml-2">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {notification.message}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
