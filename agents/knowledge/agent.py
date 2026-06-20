import logging
from typing import Dict, Any, List
from agents.knowledge.prompts import SYSTEM_PROMPT
from agents.utils import call_gemini

logger = logging.getLogger(__name__)

class KnowledgeRetrievalAgent:
    def __init__(self):
        self.name = "KnowledgeRetrievalAgent"

    async def run(self, user_id: str, prompt: str, history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Runs the Knowledge Retrieval Agent. Fetches evidence-based insights from trusted sources."""
        logger.info(f"KnowledgeRetrievalAgent running for user {user_id}")
        
        reply = await call_gemini(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=prompt,
            history=history
        )
        
        return {
            "agent": self.name,
            "text": reply,
            "data": {},
            "actions": []
        }
