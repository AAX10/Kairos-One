// =============================================================================
// Kairos One — Mock Data Service
// Realistic, internally consistent data for Phase 1 UI development.
// All shapes match the type system exactly — swapping to real APIs in Phase 2
// requires zero component changes.
// =============================================================================

import type {
  MissionNode,
  MissionSuccess,
  AgentActivity,
  AgentPipelineState,
  AIRecommendation,
  DayBrief,
  CoachInsight,
  TimeBlock,
  RecoveryPlan,
  IntegrationStatus,
} from "@/types";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function today(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function minutesAgo(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

// -----------------------------------------------------------------------------
// Mission Colors
// -----------------------------------------------------------------------------

const MISSION_COLORS = {
  interview: "#818cf8", // indigo-400
  mlAssignment: "#f59e0b", // amber-500
  hackathon: "#34d399", // emerald-400
};

// -----------------------------------------------------------------------------
// Missions (Graph Nodes)
// -----------------------------------------------------------------------------

export const MOCK_MISSIONS: MissionNode[] = [
  // === Mission 1: Interview Preparation ===
  {
    id: "mission-1",
    name: "Interview Preparation",
    description: "Prepare for Google SWE interview scheduled for next week",
    type: "mission",
    status: "in-progress",
    priority: "critical",
    deadline: daysFromNow(6),
    createdAt: daysFromNow(-5),
    completedAt: null,
    estimatedHours: 20,
    actualHours: 14,
    parentId: null,
    children: ["task-1-1", "task-1-2", "task-1-3", "task-1-4"],
    dependencies: [],
    completionPercentage: 72,
    contributionToSuccess: 8,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.interview,
  },
  {
    id: "task-1-1",
    name: "Review Data Structures",
    description: "Review arrays, trees, graphs, hash maps with practice problems",
    type: "task",
    status: "completed",
    priority: "critical",
    deadline: daysFromNow(2),
    createdAt: daysFromNow(-5),
    completedAt: daysFromNow(-1),
    estimatedHours: 6,
    actualHours: 5.5,
    parentId: "mission-1",
    children: [],
    dependencies: [],
    completionPercentage: 100,
    contributionToSuccess: 3,
    assignedAgent: "planner",
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.interview,
  },
  {
    id: "task-1-2",
    name: "Practice System Design",
    description: "Complete 5 system design problems with trade-off analysis",
    type: "task",
    status: "in-progress",
    priority: "critical",
    deadline: daysFromNow(4),
    createdAt: daysFromNow(-5),
    completedAt: null,
    estimatedHours: 8,
    actualHours: 5,
    parentId: "mission-1",
    children: [],
    dependencies: ["task-1-1"],
    completionPercentage: 60,
    contributionToSuccess: 3,
    assignedAgent: "scheduler",
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.interview,
  },
  {
    id: "task-1-3",
    name: "Mock Interviews",
    description: "Complete 3 mock interviews with feedback review",
    type: "task",
    status: "pending",
    priority: "high",
    deadline: daysFromNow(5),
    createdAt: daysFromNow(-5),
    completedAt: null,
    estimatedHours: 4,
    actualHours: 0,
    parentId: "mission-1",
    children: [],
    dependencies: ["task-1-2"],
    completionPercentage: 0,
    contributionToSuccess: 1,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.interview,
  },
  {
    id: "task-1-4",
    name: "Behavioral Questions Prep",
    description: "Prepare STAR format answers for 10 common questions",
    type: "task",
    status: "completed",
    priority: "medium",
    deadline: daysFromNow(3),
    createdAt: daysFromNow(-5),
    completedAt: daysFromNow(-2),
    estimatedHours: 2,
    actualHours: 1.5,
    parentId: "mission-1",
    children: [],
    dependencies: [],
    completionPercentage: 100,
    contributionToSuccess: 1,
    assignedAgent: "planner",
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.interview,
  },

  // === Mission 2: ML Assignment ===
  {
    id: "mission-2",
    name: "Machine Learning Assignment",
    description: "Complete neural network assignment with research paper analysis",
    type: "mission",
    status: "in-progress",
    priority: "high",
    deadline: daysFromNow(3),
    createdAt: daysFromNow(-7),
    completedAt: null,
    estimatedHours: 15,
    actualHours: 6,
    parentId: null,
    children: ["task-2-1", "task-2-2", "task-2-3"],
    dependencies: [],
    completionPercentage: 42,
    contributionToSuccess: -4,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.mlAssignment,
  },
  {
    id: "task-2-1",
    name: "Read Research Papers",
    description: "Read and summarize 3 papers on transformer architectures",
    type: "task",
    status: "completed",
    priority: "high",
    deadline: daysFromNow(0),
    createdAt: daysFromNow(-7),
    completedAt: daysFromNow(-3),
    estimatedHours: 4,
    actualHours: 4.5,
    parentId: "mission-2",
    children: [],
    dependencies: [],
    completionPercentage: 100,
    contributionToSuccess: 0,
    assignedAgent: "planner",
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.mlAssignment,
  },
  {
    id: "task-2-2",
    name: "Implement Neural Network",
    description: "Build and train the model in PyTorch with evaluation metrics",
    type: "task",
    status: "in-progress",
    priority: "critical",
    deadline: daysFromNow(2),
    createdAt: daysFromNow(-7),
    completedAt: null,
    estimatedHours: 8,
    actualHours: 1.5,
    parentId: "mission-2",
    children: [],
    dependencies: ["task-2-1"],
    completionPercentage: 20,
    contributionToSuccess: -3,
    assignedAgent: "scheduler",
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.mlAssignment,
  },
  {
    id: "task-2-3",
    name: "Write Analysis Report",
    description: "Document findings, methodology, and results",
    type: "task",
    status: "blocked",
    priority: "high",
    deadline: daysFromNow(3),
    createdAt: daysFromNow(-7),
    completedAt: null,
    estimatedHours: 3,
    actualHours: 0,
    parentId: "mission-2",
    children: [],
    dependencies: ["task-2-2"],
    completionPercentage: 0,
    contributionToSuccess: -1,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.mlAssignment,
  },

  // === Mission 3: Hackathon Project ===
  {
    id: "mission-3",
    name: "AI Hackathon Project",
    description: "Build and submit Kairos One for the Google AI Hackathon",
    type: "mission",
    status: "in-progress",
    priority: "high",
    deadline: daysFromNow(5),
    createdAt: daysFromNow(-3),
    completedAt: null,
    estimatedHours: 24,
    actualHours: 10,
    parentId: null,
    children: ["task-3-1", "task-3-2", "task-3-3", "task-3-4"],
    dependencies: [],
    completionPercentage: 55,
    contributionToSuccess: 3,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.hackathon,
  },
  {
    id: "task-3-1",
    name: "Frontend Foundation",
    description: "Build Mission Control UI with all dashboard panels",
    type: "task",
    status: "in-progress",
    priority: "critical",
    deadline: daysFromNow(1),
    createdAt: daysFromNow(-3),
    completedAt: null,
    estimatedHours: 8,
    actualHours: 6,
    parentId: "mission-3",
    children: [],
    dependencies: [],
    completionPercentage: 75,
    contributionToSuccess: 2,
    assignedAgent: "scheduler",
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.hackathon,
  },
  {
    id: "task-3-2",
    name: "Backend API",
    description: "Build FastAPI backend with Gemini agent integration",
    type: "task",
    status: "pending",
    priority: "critical",
    deadline: daysFromNow(3),
    createdAt: daysFromNow(-3),
    completedAt: null,
    estimatedHours: 8,
    actualHours: 0,
    parentId: "mission-3",
    children: [],
    dependencies: ["task-3-1"],
    completionPercentage: 0,
    contributionToSuccess: 0,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.hackathon,
  },
  {
    id: "task-3-3",
    name: "Agent Pipeline",
    description: "Implement 5 AI agents with orchestration",
    type: "task",
    status: "pending",
    priority: "high",
    deadline: daysFromNow(4),
    createdAt: daysFromNow(-3),
    completedAt: null,
    estimatedHours: 6,
    actualHours: 0,
    parentId: "mission-3",
    children: [],
    dependencies: ["task-3-2"],
    completionPercentage: 0,
    contributionToSuccess: 0,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.hackathon,
  },
  {
    id: "task-3-4",
    name: "Demo & Submission",
    description: "Record demo video, write documentation, submit",
    type: "task",
    status: "pending",
    priority: "high",
    deadline: daysFromNow(5),
    createdAt: daysFromNow(-3),
    completedAt: null,
    estimatedHours: 2,
    actualHours: 0,
    parentId: "mission-3",
    children: [],
    dependencies: ["task-3-3"],
    completionPercentage: 0,
    contributionToSuccess: 0,
    assignedAgent: null,
    criticalPath: false,
    blockedBy: [],
    milestones: [],
    color: MISSION_COLORS.hackathon,
  },
];

// -----------------------------------------------------------------------------
// Mission Success
// -----------------------------------------------------------------------------

export const MOCK_MISSION_SUCCESS: MissionSuccess = {
  overallScore: 84,
  confidence: 91,
  delta: 7,
  risk: 15,
  trend: "up",
  reasoning: [
    "Interview preparation is on track — data structures review completed ahead of schedule.",
    "ML Assignment is behind schedule — neural network implementation only 20% complete with 3 days remaining.",
    "Hackathon project protected by automatic recovery after yesterday's scheduling conflict.",
  ],
  perMissionScores: [
    {
      missionId: "mission-1",
      name: "Interview Preparation",
      score: 92,
      contribution: 8,
      trend: "up",
    },
    {
      missionId: "mission-2",
      name: "Machine Learning Assignment",
      score: 58,
      contribution: -4,
      trend: "down",
    },
    {
      missionId: "mission-3",
      name: "AI Hackathon Project",
      score: 82,
      contribution: 3,
      trend: "up",
    },
  ],
  lastCalculatedAt: minutesAgo(12),
};

// -----------------------------------------------------------------------------
// Day Brief
// -----------------------------------------------------------------------------

export const MOCK_DAY_BRIEF: DayBrief = {
  greeting: "Good evening. Here's what Kairos One accomplished today.",
  todaysFocus: "Machine Learning Assignment",
  criticalMission: "Interview Preparation",
  highestRisk: "Machine Learning Assignment (58% completion prob)",
  deepWorkRecommendation: "Protect 3 hours tomorrow morning for neural network implementation.",
  expectedProductivity: "High",
  completionEstimate: "By tomorrow 5:00 PM",
  upcomingDeadlines: "ML Assignment due in 3 days",
};

// -----------------------------------------------------------------------------
// Timeline
// -----------------------------------------------------------------------------

export const MOCK_TIMELINE: TimeBlock[] = [
  {
    id: "tb-1",
    missionId: "mission-1",
    missionName: "Interview Prep",
    title: "System Design Practice",
    start: today(8, 0),
    end: today(10, 0),
    type: "deep-work",
    status: "completed",
    color: MISSION_COLORS.interview,
  },
  {
    id: "tb-2",
    missionId: null,
    missionName: "",
    title: "Morning Break",
    start: today(10, 0),
    end: today(10, 30),
    type: "break",
    status: "completed",
    color: "#64748b",
  },
  {
    id: "tb-3",
    missionId: "mission-2",
    missionName: "ML Assignment",
    title: "Neural Network Implementation",
    start: today(10, 30),
    end: today(13, 0),
    type: "deep-work",
    status: "in-progress",
    color: MISSION_COLORS.mlAssignment,
  },
  {
    id: "tb-4",
    missionId: null,
    missionName: "",
    title: "Lunch Break",
    start: today(13, 0),
    end: today(14, 0),
    type: "break",
    status: "scheduled",
    color: "#64748b",
  },
  {
    id: "tb-5",
    missionId: "mission-3",
    missionName: "Hackathon",
    title: "Frontend Foundation Work",
    start: today(14, 0),
    end: today(16, 30),
    type: "deep-work",
    status: "scheduled",
    color: MISSION_COLORS.hackathon,
  },
  {
    id: "tb-6",
    missionId: null,
    missionName: "",
    title: "Team Standup",
    start: today(16, 30),
    end: today(17, 0),
    type: "meeting",
    status: "scheduled",
    color: "#94a3b8",
  },
  {
    id: "tb-7",
    missionId: "mission-1",
    missionName: "Interview Prep",
    title: "Mock Interview Session",
    start: today(17, 0),
    end: today(18, 30),
    type: "deep-work",
    status: "scheduled",
    color: MISSION_COLORS.interview,
  },
  {
    id: "tb-8",
    missionId: "mission-2",
    missionName: "ML Assignment",
    title: "Research Paper Review",
    start: today(19, 0),
    end: today(20, 0),
    type: "deep-work",
    status: "scheduled",
    color: MISSION_COLORS.mlAssignment,
  },
];

// -----------------------------------------------------------------------------
// Agent Activities
// -----------------------------------------------------------------------------

export const MOCK_AGENT_ACTIVITIES: AgentActivity[] = [
  {
    id: "aa-1",
    agent: "planner",
    action: "Parsed ML assignment requirements from uploaded PDF",
    impact: "Created 3 subtasks with dependency chain",
    reasoning:
      "The assignment requires sequential completion: research → implementation → report. I created dependencies to prevent premature report writing.",
    timestamp: hoursAgo(6),
    relatedMissionId: "mission-2",
  },
  {
    id: "aa-2",
    agent: "scheduler",
    action: "Protected 3-hour deep work block for tomorrow morning",
    impact: "Neural network implementation scheduled 8-11 AM",
    reasoning:
      "Coach Agent data shows you complete coding tasks 40% faster before noon. I reserved this slot and blocked conflicting meetings.",
    timestamp: hoursAgo(5),
    relatedMissionId: "mission-2",
  },
  {
    id: "aa-3",
    agent: "risk",
    action: "Deadline conflict detected on ML Assignment",
    impact: "Completion probability: 58%",
    reasoning:
      "At current pace, neural network implementation requires 6.5 more hours but only 4 hours are scheduled before the deadline. Without intervention, this mission will miss its deadline.",
    timestamp: hoursAgo(4),
    relatedMissionId: "mission-2",
  },
  {
    id: "aa-4",
    agent: "recovery",
    action: "Rescheduled 2 low-priority tasks to free up time",
    impact: "Mission Success 77% → 84%",
    reasoning:
      "Moved 'Behavioral Questions Prep' review and 'Demo planning' to next week. This freed 4 hours for the ML assignment, improving its completion probability from 42% to 58%.",
    timestamp: hoursAgo(3),
    relatedMissionId: null,
  },
  {
    id: "aa-5",
    agent: "coach",
    action: "Identified optimal work pattern",
    impact: "Recommended morning coding sessions",
    reasoning:
      "Analysis of your last 30 days shows a 40% productivity increase for coding tasks completed between 8 AM and 12 PM. All future coding blocks will be scheduled in this window.",
    timestamp: hoursAgo(2),
    relatedMissionId: null,
  },
  {
    id: "aa-6",
    agent: "planner",
    action: "Updated interview prep subtask dependencies",
    impact: "Mock interviews now unlocked",
    reasoning:
      "System design practice reached 60% completion, which is sufficient to begin mock interviews. Updated the dependency to allow parallel work.",
    timestamp: hoursAgo(1.5),
    relatedMissionId: "mission-1",
  },
  {
    id: "aa-7",
    agent: "scheduler",
    action: "Synced with Google Calendar",
    impact: "3 external events imported",
    reasoning:
      "Imported team standup (4:30 PM), dentist appointment (Thursday 2 PM), and study group (Saturday 10 AM). Adjusted Kairos One schedule to avoid conflicts.",
    timestamp: hoursAgo(1),
    relatedMissionId: null,
  },
  {
    id: "aa-8",
    agent: "risk",
    action: "Recalculated all mission success probabilities",
    impact: "Overall Mission Success: 84%",
    reasoning:
      "After recovery agent freed 4 hours and scheduler optimized the timeline, the overall success probability increased by 7 percentage points.",
    timestamp: minutesAgo(45),
    relatedMissionId: null,
  },
  {
    id: "aa-9",
    agent: "coach",
    action: "Break reminder generated",
    impact: "Suggested 10-min break after 90-min focus block",
    reasoning:
      "You've been working for 87 minutes continuously. Research shows cognitive performance drops after 90 minutes. A short break will improve your next session's quality.",
    timestamp: minutesAgo(20),
    relatedMissionId: null,
  },
  {
    id: "aa-10",
    agent: "planner",
    action: "Hackathon project plan optimized",
    impact: "Reduced estimated completion time by 2 hours",
    reasoning:
      "Identified that frontend and backend tasks can be partially parallelized. Updated the dependency graph to allow backend API work to start once frontend is 50% complete.",
    timestamp: minutesAgo(8),
    relatedMissionId: "mission-3",
  },
];

// -----------------------------------------------------------------------------
// AI Recommendations
// -----------------------------------------------------------------------------

export const MOCK_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: "rec-1",
    title: "Start Neural Network Implementation Now",
    priority: "high",
    confidence: 97,
    reason:
      "You historically complete coding tasks 40% faster in the morning. Starting now gives you a 3-hour uninterrupted block during your peak productivity window.",
    estimatedImpact: 6,
    category: "schedule",
    actions: [
      { label: "Start now", type: "accept" },
      { label: "Remind later", type: "snooze" },
      { label: "Skip", type: "dismiss" },
    ],
  },
  {
    id: "rec-2",
    title: "Compress ML Report Timeline",
    priority: "medium",
    confidence: 85,
    reason:
      "The analysis report can be drafted in parallel with the final 20% of neural network implementation. This reduces total mission time by 1.5 hours.",
    estimatedImpact: 4,
    category: "schedule",
    actions: [
      { label: "Approve", type: "accept" },
      { label: "Keep sequential", type: "dismiss" },
    ],
  },
  {
    id: "rec-3",
    title: "Schedule Mock Interview Tomorrow",
    priority: "medium",
    confidence: 92,
    reason:
      "System design practice is at 60% — sufficient for a productive mock interview. Early practice identifies weak areas with time to improve.",
    estimatedImpact: 3,
    category: "schedule",
    actions: [
      { label: "Schedule", type: "accept" },
      { label: "Wait until 80%", type: "snooze" },
    ],
  },
  {
    id: "rec-4",
    title: "Enable Focus Mode for Deep Work",
    priority: "low",
    confidence: 88,
    reason:
      "Your last 3 deep work sessions were interrupted by notifications. Enabling focus mode during scheduled blocks could improve completion rates by 25%.",
    estimatedImpact: 2,
    category: "focus",
    actions: [
      { label: "Enable", type: "accept" },
      { label: "Not now", type: "dismiss" },
    ],
  },
  {
    id: "rec-5",
    title: "Move Hackathon Demo Prep Earlier",
    priority: "medium",
    confidence: 78,
    reason:
      "If backend integration encounters issues, having demo prep done early provides a safety buffer. Historical data shows integration tasks overrun estimates 35% of the time.",
    estimatedImpact: 1,
    category: "risk",
    actions: [
      { label: "Move up", type: "accept" },
      { label: "Keep current", type: "dismiss" },
    ],
  },
];

// -----------------------------------------------------------------------------
// Coach Insights
// -----------------------------------------------------------------------------

export const MOCK_COACH_INSIGHTS: CoachInsight[] = [
  {
    id: "ci-1",
    title: "Morning Productivity Advantage",
    insight:
      "Your coding task completion rate is 40% higher between 8 AM and 12 PM compared to afternoon sessions.",
    evidence:
      "Based on 23 completed coding tasks over the last 30 days. Morning sessions average 2.1 hours to complete vs. 3.4 hours in the afternoon.",
    actionable:
      "All coding-heavy tasks have been automatically scheduled before noon.",
    category: "productivity",
  },
  {
    id: "ci-2",
    title: "Break Timing Optimization",
    insight:
      "You work best in 90-minute focused blocks followed by 15-minute breaks.",
    evidence:
      "Sessions exceeding 90 minutes show a 30% drop in task completion quality. Your optimal rhythm is 90 on, 15 off.",
    actionable:
      "Break reminders are now set at 85 minutes into each focus block.",
    category: "focus",
  },
  {
    id: "ci-3",
    title: "Deadline Proximity Effect",
    insight:
      "You complete tasks 50% faster in the 48 hours before a deadline, but quality scores drop by 15%.",
    evidence:
      "Analysis of 45 completed tasks shows a clear speed-quality tradeoff near deadlines.",
    actionable:
      "Kairos One now schedules critical tasks to complete 24 hours before deadlines to preserve quality.",
    category: "scheduling",
  },
];

// -----------------------------------------------------------------------------
// Google Integration Statuses
// -----------------------------------------------------------------------------

export const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  {
    service: "calendar",
    status: "connected",
    lastSync: minutesAgo(15),
    detail: "12 events synced",
  },
  {
    service: "gmail",
    status: "connected",
    lastSync: minutesAgo(30),
    detail: "3 threads analyzed",
  },
  {
    service: "drive",
    status: "connected",
    lastSync: hoursAgo(2),
    detail: "2 files scanned",
  },
  {
    service: "gemini",
    status: "connected",
    lastSync: minutesAgo(8),
    detail: "Gemini 2.5 Flash active",
  },
  {
    service: "firebase",
    status: "connected",
    lastSync: minutesAgo(1),
    detail: "Real-time sync",
  },
];

// -----------------------------------------------------------------------------
// Agent Pipeline (default state)
// -----------------------------------------------------------------------------

export const MOCK_PIPELINE: AgentPipelineState = {
  agents: [
    {
      type: "planner",
      status: "finished",
      currentAction: "",
      result: "Parsed 2 assignments, created 7 subtasks",
      startedAt: hoursAgo(6),
      completedAt: hoursAgo(5.8),
    },
    {
      type: "scheduler",
      status: "finished",
      currentAction: "",
      result: "Protected 3 hours of deep work, scheduled 8 blocks",
      startedAt: hoursAgo(5.7),
      completedAt: hoursAgo(5.5),
    },
    {
      type: "risk",
      status: "finished",
      currentAction: "",
      result: "1 deadline conflict detected, 1 mission at risk",
      startedAt: hoursAgo(5.4),
      completedAt: hoursAgo(5.2),
    },
    {
      type: "recovery",
      status: "finished",
      currentAction: "",
      result: "Rescheduled 2 tasks, freed 4 hours",
      startedAt: hoursAgo(5.1),
      completedAt: hoursAgo(4.9),
    },
    {
      type: "coach",
      status: "finished",
      currentAction: "",
      result: "Identified morning productivity pattern",
      startedAt: hoursAgo(4.8),
      completedAt: hoursAgo(4.7),
    },
  ],
  isRunning: false,
  trigger: "Daily morning analysis",
};

// -----------------------------------------------------------------------------
// Recovery Plan (for "I Missed Today" demo)
// -----------------------------------------------------------------------------

export const MOCK_RECOVERY_PLAN: RecoveryPlan = {
  id: "recovery-1",
  trigger: "User indicated missed day",
  originalTimeline: MOCK_TIMELINE,
  recoveredTimeline: [
    {
      id: "rtb-1",
      missionId: "mission-2",
      missionName: "ML Assignment",
      title: "Neural Network Implementation (Priority)",
      start: today(8, 0),
      end: today(11, 0),
      type: "deep-work",
      status: "scheduled",
      color: MISSION_COLORS.mlAssignment,
    },
    {
      id: "rtb-2",
      missionId: null,
      missionName: "",
      title: "Short Break",
      start: today(11, 0),
      end: today(11, 15),
      type: "break",
      status: "scheduled",
      color: "#64748b",
    },
    {
      id: "rtb-3",
      missionId: "mission-2",
      missionName: "ML Assignment",
      title: "Neural Network (Continued)",
      start: today(11, 15),
      end: today(13, 0),
      type: "deep-work",
      status: "scheduled",
      color: MISSION_COLORS.mlAssignment,
    },
    {
      id: "rtb-4",
      missionId: null,
      missionName: "",
      title: "Lunch",
      start: today(13, 0),
      end: today(13, 45),
      type: "break",
      status: "scheduled",
      color: "#64748b",
    },
    {
      id: "rtb-5",
      missionId: "mission-3",
      missionName: "Hackathon",
      title: "Frontend Completion Sprint",
      start: today(13, 45),
      end: today(16, 0),
      type: "deep-work",
      status: "scheduled",
      color: MISSION_COLORS.hackathon,
    },
    {
      id: "rtb-6",
      missionId: "mission-1",
      missionName: "Interview Prep",
      title: "System Design (Compressed)",
      start: today(16, 0),
      end: today(17, 30),
      type: "deep-work",
      status: "scheduled",
      color: MISSION_COLORS.interview,
    },
    {
      id: "rtb-7",
      missionId: "mission-2",
      missionName: "ML Assignment",
      title: "Begin Analysis Report Draft",
      start: today(18, 0),
      end: today(19, 0),
      type: "deep-work",
      status: "scheduled",
      color: MISSION_COLORS.mlAssignment,
    },
  ],
  missionSuccessBefore: 84,
  missionSuccessAfter: 72,
  changes: [
    {
      type: "rescheduled",
      description: "ML Neural Network implementation moved to priority morning slot",
      before: "10:30 AM - 1:00 PM",
      after: "8:00 AM - 1:00 PM (extended by 1.5 hours)",
    },
    {
      type: "compressed",
      description: "Interview prep system design session shortened",
      before: "2 hours",
      after: "1.5 hours (focused on weakest areas only)",
    },
    {
      type: "deprioritized",
      description: "Mock interview session moved to tomorrow",
      before: "Today 5:00 PM",
      after: "Tomorrow 5:00 PM",
    },
    {
      type: "escalated",
      description: "ML Assignment flagged as at-risk",
      before: "58% completion probability",
      after: "45% completion probability — requires sustained focus",
    },
  ],
  explanation:
    "Missing today's planned work reduces your Mission Success from 84% to 72%. I've restructured tomorrow's schedule to prioritize the ML Assignment (highest risk) with extended morning deep work. Interview prep has been compressed to essential system design practice. The mock interview moved to tomorrow evening to maintain interview readiness. The hackathon frontend sprint is preserved as it's closest to completion.",
  agentPipeline: {
    agents: [
      {
        type: "planner",
        status: "finished",
        currentAction: "",
        result: "Recalculated 3 task dependencies, 2 tasks rescheduled",
        startedAt: null,
        completedAt: null,
      },
      {
        type: "scheduler",
        status: "finished",
        currentAction: "",
        result: "Rebuilt tomorrow's calendar with 7 optimized blocks",
        startedAt: null,
        completedAt: null,
      },
      {
        type: "risk",
        status: "finished",
        currentAction: "",
        result: "ML Assignment escalated to critical risk (45%)",
        startedAt: null,
        completedAt: null,
      },
      {
        type: "recovery",
        status: "finished",
        currentAction: "",
        result: "Generated recovery plan, estimated 12% success recovery possible",
        startedAt: null,
        completedAt: null,
      },
      {
        type: "coach",
        status: "finished",
        currentAction: "",
        result: "Recommended morning-first strategy for fastest recovery",
        startedAt: null,
        completedAt: null,
      },
    ],
    isRunning: false,
    trigger: "I Missed Today",
  },
};

// Helper to get only top-level missions (no subtasks)
export function getTopLevelMissions(): MissionNode[] {
  return MOCK_MISSIONS.filter((m) => m.type === "mission");
}

// Helper to get children of a mission
export function getMissionChildren(missionId: string): MissionNode[] {
  return MOCK_MISSIONS.filter((m) => m.parentId === missionId);
}

// Helper to get full graph for a mission
export function getMissionGraph(missionId: string): MissionNode[] {
  const mission = MOCK_MISSIONS.find((m) => m.id === missionId);
  if (!mission) return [];
  const children = getMissionChildren(missionId);
  return [mission, ...children];
}

