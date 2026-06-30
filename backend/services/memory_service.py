# =============================================================================
# Kairos One — AI Memory Service & Context Builder
# Persistent AI memory engine and context construction.
# =============================================================================

from typing import Any
import asyncio

from schemas.agent import AgentActivity
from schemas.memory import MemoryItem, MemoryType
from schemas.mission import MissionNodeStatus, MissionNodeType
from schemas.timeline import TimeBlockStatus
from services.logging_service import get_logger
from services.firestore_service import get_firestore_service
from utils.helpers import iso_now, generate_id

logger = get_logger("memory")

class MemoryService:
    """Persistent context intelligence engine for AI agents."""

    def __init__(self) -> None:
        self._firestore = get_firestore_service()
        logger.info("Memory service initialized.")

    async def add_memory(self, m_type: MemoryType, content: str, importance_score: float = 50.0, source: str = "system", metadata: dict[str, Any] | None = None) -> None:
        """Create and store a persistent memory."""
        memory = MemoryItem(
            id=generate_id("mem"),
            type=m_type,
            timestamp=iso_now(),
            importance_score=importance_score,
            source=source,
            content=content,
            metadata=metadata or {}
        )
        await self._firestore.add_memory(memory)
        logger.info(f"Stored memory: {m_type} ({importance_score}/100) from {source}")

    async def build_context(self, agent_type: str, query: str = "") -> str:
        """Retrieves and formats relevant memories for an agent."""
        memories = await self._firestore.get_memories(limit=10)
        if not memories:
            return "No historical AI memories available."
            
        context_lines = []
        for m in memories:
            context_lines.append(f"- [{m.type}] (Importance: {m.importance_score}): {m.content}")
            
        return "\n".join(context_lines)

    async def synthesize_pipeline_memory(self, context: Any) -> None:
        """Synthesize a single pipeline memory and add it to mutations."""
        if not context.activities and not context.reflections:
            return
            
        content_lines = [f"Pipeline Execution for '{context.mission.name}':"]
        for act in context.activities:
            content_lines.append(f"- {act.agent.capitalize()}: {act.action} ({act.impact})")
            
        for ref in context.reflections:
            content_lines.append(f"- Insight: {ref}")
            
        memory_content = "\n".join(content_lines)
        
        mem_id = generate_id("mem")
        memory = MemoryItem(
            id=mem_id,
            type=MemoryType.REFLECTION,
            timestamp=iso_now(),
            importance_score=75.0,
            source="pipeline",
            content=memory_content,
            metadata={"mission_id": context.mission.id}
        )
        context.add_mutation(
            operation="create",
            collection="memories",
            doc_id=mem_id,
            data=memory.model_dump(by_alias=True)
        )
        logger.info(f"Synthesized pipeline memory for {context.mission.id}")

# =============================================================================
# Singleton
# =============================================================================

_memory_service: MemoryService | None = None

def get_memory_service() -> MemoryService:
    """Get or create the singleton MemoryService instance."""
    global _memory_service  # noqa: PLW0603
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service

