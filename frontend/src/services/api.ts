// =============================================================================
// Kairos One — API Service Layer
// Connects to the FastAPI backend running on port 8000.
// =============================================================================

import type {
  MissionNode,
  MissionSuccess,
  AgentActivity,
  AIRecommendation,
  DayBrief,
  CoachInsight,
  TimeBlock,
  RecoveryPlan,
  IntegrationStatus,
  CreateMissionInput,
  AgentRunResponse,
  CalendarEvent,
  MemoryInsight,
} from "@/types";

import { auth } from "@/lib/firebase";

const API_BASE =
  `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };

  await auth.authStateReady();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "API request failed");
  }
  return res.json() as Promise<T>;
}

// -----------------------------------------------------------------------------
// Mission APIs
// -----------------------------------------------------------------------------

export async function getMissions(): Promise<MissionNode[]> {
  return fetchJson<MissionNode[]>("/missions");
}

export async function getAllMissionNodes(): Promise<MissionNode[]> {
  // Phase 3: We can just use the top-level missions for now, or fetch all from backend
  return fetchJson<MissionNode[]>("/missions");
}

export async function getMissionById(
  id: string
): Promise<(MissionNode & { childNodes: MissionNode[] }) | null> {
  try {
    return await fetchJson<(MissionNode & { childNodes: MissionNode[] })>(`/missions/${id}`);
  } catch {
    return null;
  }
}

export async function getMissionGraph(missionId: string): Promise<MissionNode[]> {
  const mission = await getMissionById(missionId);
  if (!mission) return [];
  return [mission, ...mission.childNodes];
}

export async function createMission(
  input: CreateMissionInput
): Promise<MissionNode> {
  return fetchJson<MissionNode>("/missions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMissionNode(
  id: string,
  updates: Partial<MissionNode>
): Promise<MissionNode | null> {
  try {
    return await fetchJson<MissionNode>(`/missions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  } catch {
    return null;
  }
}

export async function toggleTaskComplete(id: string): Promise<MissionNode | null> {
  // We need to fetch it first to toggle
  const node = await getMissionById(id);
  if (!node) return null;

  const isCompleting = node.status !== "completed";
  return updateMissionNode(id, {
    status: isCompleting ? "completed" : "pending",
    completionPercentage: isCompleting ? 100 : 0,
  });
}

export async function splitMissionTask(id: string): Promise<void> {
  await fetchJson(`/missions/${id}/split`, { method: "POST" });
}

export async function mergeMissionTask(id: string): Promise<void> {
  await fetchJson(`/missions/${id}/merge`, { method: "POST" });
}

export async function rescheduleMissionTask(id: string): Promise<void> {
  await fetchJson(`/missions/${id}/reschedule`, { method: "POST" });
}

export async function deleteMissionTask(id: string): Promise<void> {
  await fetchJson(`/missions/${id}`, { method: "DELETE" });
}

// -----------------------------------------------------------------------------
// Dashboard APIs
// -----------------------------------------------------------------------------

export interface DashboardResponse {
  missionSuccess: MissionSuccess;
  dayBrief: DayBrief;
  recommendations: AIRecommendation[];
  agentActivities: AgentActivity[];
  coachInsights: CoachInsight[];
  integrations: IntegrationStatus[];
  timeline: TimeBlock[];
  memoryInsights: MemoryInsight[];
}

// We use the composite dashboard endpoint
export async function getDashboardData(): Promise<DashboardResponse> {
  return fetchJson<DashboardResponse>("/dashboard");
}

export async function getMissionSuccess(): Promise<MissionSuccess> {
  const data = await getDashboardData();
  return data.missionSuccess;
}

export async function getDayBrief(): Promise<DayBrief> {
  const data = await getDashboardData();
  return data.dayBrief;
}

export async function getTimeline(
  date?: string
): Promise<TimeBlock[]> {
  const query = date ? `?date=${date}` : "";
  return fetchJson<TimeBlock[]>(`/timeline${query}`);
}

export async function getRecommendations(): Promise<AIRecommendation[]> {
  const data = await getDashboardData();
  return data.recommendations;
}

export async function acceptRecommendation(id: string): Promise<void> {
  await fetchJson(`/recommendations/${id}/accept`, {
    method: "POST",
  });
}

export async function dismissRecommendation(id: string): Promise<void> {
  await fetchJson(`/recommendations/${id}/dismiss`, {
    method: "POST",
  });
}

export async function getAgentActivities(): Promise<AgentActivity[]> {
  const data = await getDashboardData();
  return data.agentActivities;
}

export async function getCoachInsights(): Promise<CoachInsight[]> {
  const data = await getDashboardData();
  return data.coachInsights;
}

export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const data = await getDashboardData();
  return data.integrations;
}

// -----------------------------------------------------------------------------
// Agent Pipeline API
// -----------------------------------------------------------------------------

export async function getAgentPipelineStatus(): Promise<AgentRunResponse> {
  return fetchJson<AgentRunResponse>("/agents/status");
}

export async function runAgentPipeline(
  missionId: string,
  trigger: string = "Manual analysis"
): Promise<AgentRunResponse> {
  return fetchJson<AgentRunResponse>("/agents/run", {
    method: "POST",
    body: JSON.stringify({ missionId, trigger }),
  });
}

// -----------------------------------------------------------------------------
// Recovery API
// -----------------------------------------------------------------------------

export async function triggerRecovery(
  type: "missed-today" | "missed-task",
  missionId?: string
): Promise<RecoveryPlan> {
  return fetchJson<RecoveryPlan>("/recovery/run", {
    method: "POST",
    body: JSON.stringify({ type, mission_id: missionId }),
  });
}

// -----------------------------------------------------------------------------
// User & Settings API
// -----------------------------------------------------------------------------

export interface UserProfile {
  uid: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  provider?: string;
  calendar_connected: boolean;
  settings: any;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    return await fetchJson<UserProfile>(`/users/${uid}`);
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<UserProfile> {
  return fetchJson<UserProfile>(`/users/${uid}`, {
    method: "POST", // The backend uses POST for both create and update
    body: JSON.stringify(profile),
  });
}

// -----------------------------------------------------------------------------
// Calendar Integration API
// -----------------------------------------------------------------------------

export async function authenticateCalendar(authCode: string): Promise<{ status: string }> {
  return fetchJson<{ status: string }>("/calendar/exchange", {
    method: "POST",
    body: JSON.stringify({ auth_code: authCode }),
  });
}

export async function getPrimaryCalendar(): Promise<{ id: string; summary: string }> {
  return fetchJson<{ id: string; summary: string }>("/calendar/primary");
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  return fetchJson<CalendarEvent[]>("/calendar/events/today");
}

export async function getWeekEvents(): Promise<CalendarEvent[]> {
  return fetchJson<CalendarEvent[]>("/calendar/events/week");
}

export async function refreshCalendar(): Promise<{ status: string }> {
  return fetchJson<{ status: string }>("/calendar/refresh", {
    method: "POST",
  });
}

