import logging
from typing import Dict, Any, List
from agents.health_advisor.prompts import SYSTEM_PROMPT
from agents.utils import call_gemini

logger = logging.getLogger(__name__)

class HealthAdvisorAgent:
    def __init__(self):
        self.name = "HealthAdvisorAgent"

    async def run(self, user_id: str, prompt: str, history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Runs the Health Advisor Agent to provide medical explanations and education."""
        logger.info(f"HealthAdvisorAgent running for user {user_id}")
        
        # Invoke safety-wrapped Gemini API
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
