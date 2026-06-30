# =============================================================================
# Kairos One — Memory Search API
# =============================================================================

from fastapi import APIRouter, Depends
from api.dependencies import get_current_user, Depends
from pydantic import BaseModel

from schemas.memory import MemoryItem
from services.firestore_service import FirestoreService, get_firestore_service
from services.gemini_service import GeminiService, get_gemini_service

router = APIRouter(prefix="/memory", tags=["Memory"])

class MemorySearchResponse(BaseModel):
    answer: str
    memories: list[MemoryItem]

@router.get("/search", response_model=MemorySearchResponse)
async def search_memory(
    q: str,
    firestore: FirestoreService = Depends(get_firestore_service),
    gemini: GeminiService = Depends(get_gemini_service)
):
    """
    Search the AI memory engine using the query.
    Synthesizes an answer using Gemini and returns the relevant memories.
    """
    # 1. Fetch memories (simulated semantic search by fetching all/recent high-importance memories)
    # In a full production system with vector DB, we would do a semantic embedding search here.
    memories = await firestore.get_memories(limit=30, min_importance=0.0)
    
    # Simple heuristic text match to find relevant ones if there are too many
    query_terms = set(q.lower().split())
    relevant_memories = []
    
    for m in memories:
        if m.importance_score >= 80: # Always include highly important
            relevant_memories.append(m)
            continue
            
        m_terms = set(m.content.lower().split())
        if len(query_terms.intersection(m_terms)) > 0:
            relevant_memories.append(m)
            
    # Sort and slice
    relevant_memories.sort(key=lambda m: (m.importance_score, m.timestamp), reverse=True)
    relevant_memories = relevant_memories[:15]
    
    # 2. Synthesize answer using Gemini
    context_str = "\n".join([f"[{m.timestamp}] ({m.type.upper()}) {m.content}" for m in relevant_memories])
    
    prompt = (
        f"The user is searching their AI memory for the following query: '{q}'\n\n"
        f"Here are the most relevant memory records retrieved from the Sentinel AI Engine:\n"
        f"{context_str}\n\n"
        f"Please synthesize a concise, helpful answer to the user's query based ONLY on these memories. "
        f"If the answer is not in the memories, state that you don't have a record of it."
    )
    
    system_instruction = "You are the Sentinel AI Memory Engine. Answer the user's query based on their historical memory."
    
    # Generate simple text
    response_text = await gemini.generate_text(
        prompt=prompt,
        system_instruction=system_instruction
    )
    
    return MemorySearchResponse(
        answer=response_text,
        memories=relevant_memories
    )

