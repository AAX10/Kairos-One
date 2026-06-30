"use client";

import { useRef } from "react";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Send, Target, ShieldAlert, CalendarDays, BarChart3 } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slideFromRight, SPRING, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "Plan my day", icon: CalendarDays },
  { label: "What's at risk?", icon: ShieldAlert },
  { label: "Optimize schedule", icon: Target },
  { label: "Explain Mission Success", icon: BarChart3 },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "init-1",
    role: "assistant",
    content:
      "I'm Kairos One, your AI Chief of Staff. I can help you understand your schedule, assess risks, or optimize your plan. What would you like to know?",
    timestamp: new Date(),
  },
];

export function AssistantPanel() {
  const isOpen = useUIStore((s) => s.assistantOpen);
  const close = useUIStore((s) => s.setAssistantOpen);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const idCounter = useRef(0);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `user-${++idCounter.current}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const assistantMsg: Message = {
      id: `asst-${++idCounter.current}`,
      role: "assistant",
      content:
        "I've analyzed your request. Based on your current schedule and mission priorities, here's my recommendation: Focus on the ML Assignment neural network implementation first — it has the highest risk score and your morning productivity window is optimal for coding tasks. This would improve your Mission Success by approximately 4%.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
    }, 800);
  };

  const handleQuickAction = (label: string) => {
    const responses: Record<string, string> = {
      "Plan my day":
        "Based on your 3 active missions, here's today's optimal plan: 1) Neural Network Implementation (8-11 AM, deep work), 2) System Design Practice (11:30 AM-1 PM), 3) Hackathon Frontend (2-4:30 PM). I've protected breaks and buffer time between sessions.",
      "What's at risk?":
        "Your ML Assignment is the highest risk mission at 58% completion probability. The neural network implementation is behind schedule — you need 6.5 more hours but only 4 are scheduled. I recommend extending tomorrow's morning session.",
      "Optimize schedule":
        "I found 2 optimizations: 1) Move system design practice to evening (your retention is better for review tasks after 5 PM). 2) Consolidate two 1-hour ML blocks into a single 2-hour deep work session. This would improve Mission Success by +3%.",
      "Explain Mission Success":
        "Your Mission Success is 84%, calculated from 3 missions: Interview Prep (92%, contributing +8%), ML Assignment (58%, contributing -4%), and Hackathon (82%, contributing +3%). The ML Assignment is pulling your score down due to the deadline proximity and low completion rate.",
    };

    const userMsg: Message = {
      id: `user-${++idCounter.current}`,
      role: "user",
      content: label,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `asst-${++idCounter.current}`,
        role: "assistant",
        content: responses[label] ?? "I'll analyze that for you.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => close(false)}
          />
          <motion.div
            variants={slideFromRight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING.default}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-[360px] border-l border-white/[0.06] bg-background/95 backdrop-blur-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold">Kairos One AI</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                  ⌘J
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => close(false)}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: STAGGER.fast * i, ...SPRING.gentle }}
                      onClick={() => handleQuickAction(action.label)}
                      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
                    >
                      <Icon size={11} />
                      {action.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "bg-white/[0.04] text-foreground/80 border border-white/[0.06]"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Kairos One anything..."
                  className="flex-1 bg-white/[0.04] border-white/[0.08] text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/20"
                >
                  <Send size={14} />
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

