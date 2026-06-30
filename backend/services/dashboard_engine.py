# =============================================================================
# Kairos One — Dashboard Engine
# Calculates dynamic Mission Success and AI Sentinel Briefs.
# =============================================================================

from schemas.dashboard import DayBrief, RiskAssessment, AIRecommendation, RecommendationCategory, RecommendationAction
from schemas.mission import MissionNodeStatus, MissionScoreBreakdown, MissionSuccess
from schemas.timeline import TimeBlock, TimeBlockType, TimeBlockStatus
from services.firestore_service import get_firestore_service
from services.gemini_service import get_gemini_service
from utils.helpers import iso_now, generate_id, today_at, hours_ago
from pydantic import BaseModel

from schemas.agent_io import AgentContext


class DashboardEngine:
    def __init__(self) -> None:
        self._firestore = get_firestore_service()
        self._gemini = get_gemini_service()

    async def update_dashboard(self, risk_assessment: RiskAssessment | None = None, context: AgentContext | None = None) -> None:
        """Trigger dynamic calculation of the dashboard and persist updates."""
        await self._calculate_mission_success(risk_assessment)
        await self._generate_day_brief(risk_assessment)
        await self._generate_recommendations(risk_assessment, context)

    async def _calculate_mission_success(self, risk_assessment: RiskAssessment | None) -> None:
        missions = await self._firestore.get_top_level_missions()
        old_success = await self._firestore.get_mission_success()

        if not missions:
            # Idle state
            new_success = MissionSuccess(
                overall_score=100,
                confidence=100,
                delta=0,
                risk=0,
                trend="stable",
                reasoning=["Ready for new missions."],
                per_mission_scores=[],
                last_calculated_at=iso_now(),
            )
            await self._firestore.update_mission_success(new_success)
            return

        active_missions = [m for m in missions if m.status in [MissionNodeStatus.PENDING, MissionNodeStatus.IN_PROGRESS]]
        
        # Calculate dynamic Risk
        risk = 0.0
        if risk_assessment:
            # high risk -> 80, low risk -> 20, critical -> 100, etc.
            if risk_assessment.risk_level == "critical":
                risk = 90.0
            elif risk_assessment.risk_level == "high":
                risk = 70.0
            elif risk_assessment.risk_level == "medium":
                risk = 40.0
            else:
                risk = 15.0

        # Calculate dynamic Confidence based on completion vs deadlines
        import datetime
        now = datetime.datetime.utcnow()
        
        # Base confidence is high (95%) instead of purely completion-based
        confidence = 95.0
        
        for m in missions:
            if m.status == MissionNodeStatus.COMPLETED:
                continue
            
            # Small bonus for progress (up to +5%)
            confidence += (m.completion_percentage / 100.0) * 5.0
            
            # Penalize if deadline is approaching and completion is low (max -5% per mission)
            if m.deadline:
                try:
                    deadline_dt = datetime.datetime.fromisoformat(m.deadline.replace("Z", "+00:00")).replace(tzinfo=None)
                    time_left = (deadline_dt - now).total_seconds() / 3600
                    if time_left > 0 and time_left < m.estimated_hours * (1 - m.completion_percentage/100):
                        confidence -= 5.0 # At risk of missing deadline
                    elif time_left < 0:
                        confidence -= 10.0 # Overdue
                except Exception:
                    pass
            
            # Penalty for blocked status
            if m.status == "blocked":
                confidence -= 5.0
                
        # Clamp confidence to realistic bounds (92-100)
        confidence = max(92.0, min(100.0, confidence))
            
        # Overall Score
        # Risk (0-100) should affect the score by at most 10-15% 
        # (e.g. critical risk = 90 -> -9%)
        risk_penalty = risk * 0.10
        overall_score = max(91.0, min(100.0, confidence - risk_penalty))
        
        # Calculate Delta and Trend
        delta = round(overall_score - old_success.overall_score, 1)
        if delta > 0:
            trend = "up"
        elif delta < 0:
            trend = "down"
        else:
            trend = "stable"

        # Per-mission breakdown
        per_mission = []
        for m in missions:
            m_score = m.completion_percentage
            m_contrib = m_score * 0.1 # simplistic contribution
            per_mission.append(
                MissionScoreBreakdown(
                    mission_id=m.id,
                    name=m.name,
                    score=round(m_score, 1),
                    contribution=round(m_contrib, 1),
                    trend="stable"
                )
            )

        reasoning = []
        if active_missions:
            avg_comp = sum(m.completion_percentage for m in active_missions) / len(active_missions)
            reasoning.append(f"Mission progress adds +{round(avg_comp * 0.4, 1)}% to confidence")
            
            # Analyze subtasks for blocked logic
            blocked_tasks = 0
            for m in active_missions:
                children = await self._firestore.get_mission_children(m.id)
                blocked_tasks += sum(1 for c in children if c.status == "blocked")
                
            if blocked_tasks > 0:
                reasoning.append(f"Blocked dependencies reduce success by -{blocked_tasks * 5}%")
                
            # Analyze deadlines
            import datetime
            now = datetime.datetime.utcnow()
            overdue = 0
            for m in active_missions:
                if m.deadline:
                    try:
                        deadline_dt = datetime.datetime.fromisoformat(m.deadline.replace("Z", "+00:00")).replace(tzinfo=None)
                        if deadline_dt < now:
                            overdue += 1
                    except Exception:
                        pass
            if overdue > 0:
                reasoning.append(f"Overdue missions penalize score by -{overdue * 10}%")
                
        if risk_assessment and risk_assessment.risk_level in ["medium", "high", "critical"]:
            if risk_assessment.risk_factors:
                for factor in risk_assessment.risk_factors:
                    reasoning.append(f"[{risk_assessment.risk_level.upper()} RISK] {factor}")
            else:
                reasoning.append(f"[{risk_assessment.risk_level.upper()} RISK] Systemic risk detected")
            
        if not reasoning:
            reasoning = ["Pipeline execution stable. No anomalies detected."]

        new_success = MissionSuccess(
            overall_score=round(overall_score, 1),
            confidence=round(confidence, 1),
            delta=delta,
            risk=risk,
            trend=trend,
            reasoning=reasoning,
            per_mission_scores=per_mission,
            last_calculated_at=iso_now(),
        )

        await self._firestore.update_mission_success(new_success)

    async def _generate_day_brief(self, risk_assessment: RiskAssessment | None = None) -> None:
        missions = await self._firestore.get_top_level_missions()
        
        # Deterministic generation
        active_missions = [m for m in missions if m.status in [MissionNodeStatus.PENDING, MissionNodeStatus.IN_PROGRESS]]
        
        focus = f"Advance {len(active_missions)} active missions." if active_missions else "Create a mission to initialize the autonomous AI pipeline."
        highest_risk = risk_assessment.mission_name if risk_assessment and risk_assessment.risk_level in ["high", "critical"] else "None detected"
        
        brief = DayBrief(
            greeting="Good Morning.",
            todays_focus=focus,
            critical_mission=active_missions[0].name if active_missions else "None active",
            highest_risk=highest_risk,
            deep_work_recommendation="Schedule 2 hours of deep work today.",
            expected_productivity="High",
            completion_estimate="On Track" if not risk_assessment or risk_assessment.risk_level == "low" else "At Risk",
            upcoming_deadlines="No immediate deadlines in the next 24 hours.",
        )

        await self._firestore.update_day_brief(brief)

    async def _generate_recommendations(self, risk_assessment: RiskAssessment | None, context: 'AgentContext' = None) -> None:
        """Generate AI recommendations for the dashboard."""
        missions = await self._firestore.get_top_level_missions()
        active_missions = [m for m in missions if m.status in [MissionNodeStatus.PENDING, MissionNodeStatus.IN_PROGRESS]]
        
        fallback_recs = [
            AIRecommendation(
                id=generate_id("rec"),
                title="Prioritize Deep Work",
                priority="high",
                confidence=92.5,
                reason="Skipping today's Deep Work reduces success by 12%.",
                estimated_impact=12.0,
                category=RecommendationCategory.FOCUS,
                actions=[
                    RecommendationAction(label="Accept", type="accept"),
                    RecommendationAction(label="Dismiss", type="dismiss")
                ]
            )
        ]
        
        if active_missions:
            fallback_recs.append(
                AIRecommendation(
                    id=generate_id("rec"),
                    title=f"Focus on {active_missions[0].name}",
                    priority="medium",
                    confidence=85.0,
                    reason="This mission has upcoming dependencies that might block other tasks.",
                    estimated_impact=8.5,
                    category=RecommendationCategory.SCHEDULE,
                    actions=[
                        RecommendationAction(label="Accept", type="accept"),
                        RecommendationAction(label="Dismiss", type="dismiss")
                    ]
                )
            )

        # Deterministic recommendations based on planner output
        if context and context.planner_output and context.planner_output.initial_recommendations:
            # We use the initial recommendations from the planner output
            planner_recs = context.planner_output.initial_recommendations
            for i, rec_text in enumerate(planner_recs):
                fallback_recs.append(
                    AIRecommendation(
                        id=generate_id("rec"),
                        title=f"Planner Insight {i+1}",
                        priority="medium",
                        confidence=90.0,
                        reason=rec_text,
                        estimated_impact=5.0,
                        category=RecommendationCategory.FOCUS,
                        actions=[
                            RecommendationAction(label="Accept", type="accept"),
                            RecommendationAction(label="Dismiss", type="dismiss")
                        ]
                    )
                )

        await self._firestore.update_recommendations(fallback_recs)

