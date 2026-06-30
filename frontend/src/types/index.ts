// =============================================================================
// Kairos One — Domain Type System
// Built around the mission dependency graph model.
// Every AI output includes confidence, reasoning, and impact for explainability.
// =============================================================================

// -----------------------------------------------------------------------------
// Core Enums
// -----------------------------------------------------------------------------

export type MissionNodeType = "goal" | "mission" | "task" | "calendar-block";

export type MissionNodeStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "blocked"
  | "missed";

export type Priority = "critical" | "high" | "medium" | "low";

export type AgentType = "planner" | "scheduler" | "risk" | "recovery" | "coach";

export type AgentStatus = "idle" | "thinking" | "working" | "finished" | "error";

// -----------------------------------------------------------------------------
// Mission Graph
// -----------------------------------------------------------------------------

export interface MissionNode {
  id: string;
  name: string;
  description: string;
  type: MissionNodeType;
  status: MissionNodeStatus;
  priority: Priority;
  deadline: string; // ISO 8601
  createdAt: string;
  completedAt: string | null;
  estimatedHours: number;
  actualHours: number;
  parentId: string | null;
  children: string[]; // child node IDs
  dependencies: string[]; // prerequisite node IDs
  completionPercentage: number; // 0–100
  contributionToSuccess: number; // percentage points contributed to overall score
  assignedAgent: AgentType | null;
  color: string; // hex color for calendar/timeline rendering
  criticalPath: boolean;
  blockedBy: string[];
  complexityScore?: number;
  category?: string | null;
  projectClassification?: string | null;
  milestones: string[];
  updatedAt?: string | null;
  calendarEventId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}

export interface Milestone {
  id: string;
  missionId: string;
  title: string;
  status: "pending" | "completed";
  createdAt: string;
  completedAt: string | null;
}

// -----------------------------------------------------------------------------
// Mission Success — Primary KPI
// -----------------------------------------------------------------------------

export interface MissionScoreBreakdown {
  missionId: string;
  name: string;
  score: number; // 0–100
  contribution: number; // positive or negative percentage points
  trend: "up" | "down" | "stable";
}

export interface MissionSuccess {
  overallScore: number; // 0–100
  confidence: number; // 0–100
  delta: number; // change from previous calculation (can be negative)
  risk: number; // 0-100
  trend: "up" | "down" | "stable";
  reasoning: string[];
  perMissionScores: MissionScoreBreakdown[];
  lastCalculatedAt: string;
}

// -----------------------------------------------------------------------------
// Agent System
// -----------------------------------------------------------------------------

export interface AgentState {
  type: AgentType;
  status: AgentStatus;
  currentAction: string;
  result: string;
  confidence?: number;
  executionDurationMs?: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AgentPipelineState {
  agents: AgentState[];
  isRunning: boolean;
  trigger: string; // what caused this pipeline run
}

export interface AgentActivity {
  id: string;
  agent: AgentType;
  action: string;
  impact: string;
  reasoning: string;
  timestamp: string;
  relatedMissionId: string | null;
}

export interface AgentRunResponse {
  pipeline: AgentPipelineState;
  activities: AgentActivity[];
}

// -----------------------------------------------------------------------------
// AI Outputs — All Explainable
// -----------------------------------------------------------------------------

export interface AIRecommendation {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  confidence: number; // 0–100
  reason: string;
  estimatedImpact: number; // Mission Success delta (e.g., +4 means +4%)
  category: "schedule" | "focus" | "risk" | "recovery" | "habit";
  actions: RecommendationAction[];
}

export interface RecommendationAction {
  label: string;
  type: "accept" | "dismiss" | "snooze";
}

export interface DayBrief {
  greeting: string;
  todaysFocus: string;
  criticalMission: string;
  highestRisk: string;
  deepWorkRecommendation: string;
  expectedProductivity: string;
  completionEstimate: string;
  upcomingDeadlines: string;
}

export interface CoachInsight {
  id: string;
  title: string;
  insight: string;
  evidence: string;
  actionable: string;
  category: "productivity" | "focus" | "scheduling" | "health";
}

export interface MemoryInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  icon?: string;
}

// -----------------------------------------------------------------------------
// Calendar
// -----------------------------------------------------------------------------

export type TimeBlockType = "deep-work" | "meeting" | "break" | "admin" | "buffer";

export type TimeBlockStatus = "scheduled" | "in-progress" | "completed" | "missed";

export interface TimeBlock {
  id: string;
  missionId: string | null;
  missionName: string;
  title: string;
  start: string; // ISO 8601
  end: string;
  type: TimeBlockType;
  status: TimeBlockStatus;
  color: string;
  location?: string;
  description?: string;
  organizer?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  status?: string;
  organizer?: string;
  calendarId?: string;
}

// -----------------------------------------------------------------------------
// Recovery
// -----------------------------------------------------------------------------

export interface RecoveryChange {
  type: "rescheduled" | "compressed" | "deprioritized" | "escalated";
  description: string;
  before: string;
  after: string;
}

export interface RecoveryPlan {
  id: string;
  trigger: string;
  originalTimeline: TimeBlock[];
  recoveredTimeline: TimeBlock[];
  missionSuccessBefore: number;
  missionSuccessAfter: number;
  changes: RecoveryChange[];
  explanation: string;
  agentPipeline: AgentPipelineState;
}

// -----------------------------------------------------------------------------
// Google Integrations
// -----------------------------------------------------------------------------

export type IntegrationService =
  | "calendar"
  | "gmail"
  | "drive"
  | "gemini"
  | "firebase";

export type IntegrationStatusType =
  | "connected"
  | "syncing"
  | "analyzing"
  | "disconnected";

export interface IntegrationStatus {
  service: IntegrationService;
  status: IntegrationStatusType;
  lastSync: string;
  detail: string;
}

// -----------------------------------------------------------------------------
// UI State Types
// -----------------------------------------------------------------------------

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: "default" | "success" | "error" | "warning";
  duration?: number;
}

// -----------------------------------------------------------------------------
// API Input Types
// -----------------------------------------------------------------------------

export interface CreateMissionInput {
  name: string;
  description: string;
  deadline: string;
  priority: Priority;
  estimatedHours: number;
}

