# =============================================================================
# Kairos One — Dashboard Schemas
# Composite response for the GET /dashboard endpoint.
# Includes all AI recommendation, day brief, and coach insight types.
# =============================================================================

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from schemas.agent import AgentActivity
from schemas.mission import MissionSuccess
from schemas.timeline import IntegrationStatus, TimeBlock
from schemas.memory import MemoryInsight


# -----------------------------------------------------------------------------
# Recommendation
# -----------------------------------------------------------------------------


class RecommendationAction(BaseModel):
    """An action button for an AI recommendation."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    label: str
    type: str  # "accept" | "dismiss" | "snooze"


class RecommendationCategory(StrEnum):
    SCHEDULE = "schedule"
    FOCUS = "focus"
    RISK = "risk"
    RECOVERY = "recovery"
    HABIT = "habit"


class AIRecommendation(BaseModel):
    """An explainable AI recommendation with confidence and impact."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    title: str
    priority: str
    confidence: float  # 0–100
    reason: str
    estimated_impact: float
    category: RecommendationCategory
    actions: list[RecommendationAction]


# -----------------------------------------------------------------------------
# Day Brief
# -----------------------------------------------------------------------------


class BriefPriority(BaseModel):
    """A priority item in the daily brief."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    mission_id: str
    mission_name: str
    task_name: str
    estimated_minutes: int
    urgency: str  # "high" | "medium" | "low"


class DayBrief(BaseModel):
    """The daily AI briefing."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    greeting: str = Field(description="A short welcoming greeting.")
    todays_focus: str = Field(description="The primary objective for today.")
    critical_mission: str = Field(description="The most important mission to complete.")
    highest_risk: str = Field(description="The mission with the highest risk of missing its deadline.")
    deep_work_recommendation: str = Field(description="Actionable advice for deep work based on today's schedule.")
    expected_productivity: str = Field(description="Expected productivity metric, e.g. 'High' or '85%'.")
    completion_estimate: str = Field(description="Estimated time of completing today's priorities.")
    upcoming_deadlines: str = Field(description="Summary of upcoming deadlines in the next 24-48 hours.")


# -----------------------------------------------------------------------------
# Coach Insight
# -----------------------------------------------------------------------------


class CoachInsightCategory(StrEnum):
    PRODUCTIVITY = "productivity"
    FOCUS = "focus"
    SCHEDULING = "scheduling"
    HEALTH = "health"


class CoachInsight(BaseModel):
    """A behavioral insight from the Coach agent."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    title: str
    insight: str
    evidence: str
    actionable: str
    category: CoachInsightCategory


# -----------------------------------------------------------------------------
# Risk Assessment (agent output)
# -----------------------------------------------------------------------------


class RiskAssessment(BaseModel):
    """Risk analysis output from the Risk agent."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    mission_id: str
    mission_name: str
    completion_probability: float  # 0–100
    risk_level: str  # "low" | "medium" | "high" | "critical"
    risk_factors: list[str]
    recommended_actions: list[str]


# -----------------------------------------------------------------------------
# Composite Dashboard Response
# -----------------------------------------------------------------------------


class DashboardResponse(BaseModel):
    """Full dashboard data returned by GET /dashboard."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    mission_success: MissionSuccess
    day_brief: DayBrief
    recommendations: list[AIRecommendation]
    agent_activities: list[AgentActivity]
    coach_insights: list[CoachInsight]
    integrations: list[IntegrationStatus]
    timeline: list[TimeBlock] = Field(default_factory=list)
    memory_insights: list[MemoryInsight] = Field(default_factory=list)

