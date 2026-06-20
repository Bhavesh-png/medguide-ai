import logging
from typing import Dict, Any, List
from agents.emergency.prompts import SYSTEM_PROMPT
from agents.utils import call_gemini

logger = logging.getLogger(__name__)

class EmergencyEscalationAgent:
    def __init__(self):
        self.name = "EmergencyEscalationAgent"

    async def run(self, user_id: str, prompt: str, history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Runs the Emergency Escalation Agent. Halts normal operations to issue safety alerts."""
        logger.info(f"EmergencyEscalationAgent running for user {user_id}")
        
        reply = await call_gemini(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=prompt,
            history=history
        )
        
        return {
            "agent": self.name,
            "text": reply,
            "data": {
                "emergency_detected": True,
                "requires_immediate_action": True
            },
            "actions": [
                {
                    "type": "prompt_consent_emergency_alert",
                    "params": {
                        "prompt": "Would you like us to contact your emergency contacts or share your location with emergency services?"
                    }
                }
            ]
        }
