# =============================================================================
# Kairos One — Agent I/O Schemas
# Defines the structured outputs expected from Gemini for each agent.
# =============================================================================

from typing import Literal, Optional, Any

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Common
# -----------------------------------------------------------------------------


class BaseAgentOutput(BaseModel):
    """Base output model containing standard explanation fields."""

    action: str = Field(description="Short, action-oriented summary of what the agent did (e.g., 'Optimized schedule for Mission A').")
    impact: str = Field(description="Short summary of the impact (e.g., 'Found 3 optimal slots, protected deep work').")
    reasoning: str = Field(description="Detailed explanation of the reasoning and methodology.")
    reflection: str = Field(description="A short reflection justifying why this decision was made, what the agent learned, or how it can improve next time.")


# -----------------------------------------------------------------------------
# 1. Planner Output
# -----------------------------------------------------------------------------


class PlannerSubtask(BaseModel):
    name: str
    description: str
    estimated_hours: float
    category: str = Field(description="Category of the task (e.g., 'Backend', 'Frontend', 'Research').")
    dependencies: list[str] = Field(description="List of subtask names this task depends on. Must form a DAG.")
    priority: Literal["low", "medium", "high", "critical"] = Field(description="Priority level for this specific subtask.")

class PlannerOutput(BaseAgentOutput):
    """Structured output from the Planner Agent."""

    classification: str = Field(description="Classification of the project type (e.g., Software Project, Hackathon, Research).")
    estimated_project_hours: float = Field(description="Total estimated hours for the entire mission.")
    completion_probability: int = Field(description="Probability 1-100 of successfully completing the mission.")
    
    tasks: list[PlannerSubtask] = Field(description="List of 15-25 specific, actionable, and measurable subtasks.")
    dependencies: dict[str, list[str]] = Field(description="Map of task name to list of dependency names.")
    milestones: list[str] = Field(description="Key milestones to track progress.")
    critical_path: list[str] = Field(description="List of task names that form the critical path.")
    suggested_schedule: str = Field(description="Brief suggested schedule approach.")
    risks: list[str] = Field(description="Potential risks identified during decomposition.")
    initial_risks: list[str] = Field(default_factory=list, description="Initial detailed risk factors.")
    initial_recommendations: list[str] = Field(default_factory=list, description="Initial recommendations and actions.")
    coach_insights: list[str] = Field(default_factory=list, description="Initial coaching insights and advice.")
    
    # Keeping old fields with defaults for backward compatibility if needed, or just removing them if strictly following prompt.
    difficulty_score: int = Field(default=50, description="Difficulty score 1-100.")
    required_context: list[str] = Field(default_factory=list, description="Context, materials, or prerequisites needed before starting.")
    priority: Literal["low", "medium", "high", "critical"] = Field(default="medium", description="Suggested overall priority for the mission.")
    mission_complexity_score: int = Field(default=50, description="Complexity score 1-100.")
    learning_curve: Literal["low", "medium", "high"] = Field(default="medium")
    deep_work_recommendations: str = Field(default="", description="Advice on deep work needed.")


# -----------------------------------------------------------------------------
# 2. Scheduler Output
# -----------------------------------------------------------------------------


class ScheduleBlock(BaseModel):
    title: str
    type: Literal["deep-work", "break", "meeting", "buffer"]
    duration_hours: float
    best_time_of_day: Literal["morning", "afternoon", "evening"]


class SchedulerOutput(BaseAgentOutput):
    """Structured output from the Scheduler Agent."""

    blocks: list[ScheduleBlock]
    best_execution_order: list[str] = Field(description="Ordered list of task/mission names.")
    protected_time: str = Field(description="Description of time protected from meetings.")
    conflict_detection: list[str] = Field(description="List of potential conflicts detected.")
    scheduling_confidence: int = Field(description="Confidence in schedule 1-100.")


# -----------------------------------------------------------------------------
# 3. Risk Output
# -----------------------------------------------------------------------------


class RiskOutput(BaseAgentOutput):
    """Structured output from the Risk Agent."""

    completion_probability: int = Field(description="Probability 1-100 of completing on time.")
    deadline_confidence: int = Field(description="Confidence 1-100 in meeting the deadline.")
    delay_prediction: str = Field(description="Predicted delay, if any (e.g., '2 days late').")
    risk_factors: list[str] = Field(description="Specific risk factors identified.")
    critical_bottlenecks: list[str] = Field(description="Critical bottlenecks blocking progress.")
    priority_conflicts: list[str] = Field(description="Conflicts with other high priority missions.")


# -----------------------------------------------------------------------------
# 4. Recovery Output
# -----------------------------------------------------------------------------


class RecoveryAction(BaseModel):
    task_name: str
    action: Literal["compress", "reschedule", "delegate", "drop"]
    justification: str


class RecoveryOutput(BaseAgentOutput):
    """Structured output from the Recovery Agent."""

    missed_work_analysis: str = Field(description="Analysis of what was missed and why.")
    recalculated_dependencies: list[str] = Field(description="Changes to dependencies.")
    recovery_explanation: str = Field(description="Explanation of the recovery strategy to the user.")
    execution_plan: list[RecoveryAction] = Field(description="Specific actions to recover.")


# -----------------------------------------------------------------------------
# 5. Coach Output
# -----------------------------------------------------------------------------


class CoachOutput(BaseAgentOutput):
    """Structured output from the Coach Agent."""

    personalized_coaching: str = Field(description="Personalized, non-generic advice.")
    expected_productivity_gain: str = Field(description="e.g., '+20% speed', 'less fatigue'")
    confidence: int = Field(description="Confidence in coaching effectiveness 1-100.")
    estimated_mission_success_improvement: int = Field(description="Estimated point increase in Mission Success.")

# -----------------------------------------------------------------------------
# Context payload passed between agents
# -----------------------------------------------------------------------------

class AgentContext(BaseModel):
    """Payload accumulated as the pipeline executes."""
    mission_id: str
    planner_output: Optional[PlannerOutput] = None
    scheduler_output: Optional[SchedulerOutput] = None
    risk_output: Optional["RiskOutput"] = None
    recovery_output: Optional["RecoveryOutput"] = None
    coach_output: Optional["CoachOutput"] = None


# -----------------------------------------------------------------------------
# 6. Orchestrator Unified Output
# -----------------------------------------------------------------------------

class OrchestratorOutput(BaseModel):
    """The unified single JSON response expected from Gemini."""
    planner: PlannerOutput
    scheduler: SchedulerOutput
    risk: RiskOutput
    recovery: RecoveryOutput
    coach: CoachOutput

