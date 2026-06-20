import logging
import re
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

EMERGENCY_KEYWORDS = [
    r"chest\s*pain",
    r"difficulty\s*breathing",
    r"shortness\s*of\s*breath",
    r"severe\s*bleeding",
    r"loss\s*of\s*consciousness",
    r"stroke\s*symptoms",
    r"suicidal\s*thoughts",
    r"suicide",
    r"heart\s*attack",
    r"poisoning",
    r"overdose"
]

class Router:
    def __init__(self):
        pass

    def detect_emergency(self, prompt: str) -> bool:
        """Returns True if user prompt matches any emergency keywords."""
        prompt_lower = prompt.lower()
        for kw in EMERGENCY_KEYWORDS:
            if re.search(kw, prompt_lower):
                logger.warning(f"Emergency detected: matched '{kw}' pattern in prompt: '{prompt}'")
                return True
        return False

    def classify_intent(self, prompt: str) -> List[str]:
        """Classify user prompt to one or more agent classes.
        
        Returns a list of target agent names to call.
        """
        prompt_lower = prompt.lower()
        targets = []

        if self.detect_emergency(prompt):
            return ["EmergencyEscalationAgent"]

        # Check for reminder intent
        reminder_keywords = [
            "remind", "schedule", "calendar", "appointment", "doctor", 
            "visit", "medication timing", "take medicine", "forgot my", 
            "next week", "tomorrow", "time to take"
        ]
        is_reminder = any(kw in prompt_lower for kw in reminder_keywords)
        
        # Check for knowledge intent
        knowledge_keywords = [
            "what is", "how does", "mechanism", "scientific", "study", 
            "statistics", "who", "cdc", "nih", "research", "evidence", "proven"
        ]
        is_knowledge = any(kw in prompt_lower for kw in knowledge_keywords)

        # Check for general health advice
        advisor_keywords = [
            "symptom", "pain", "fever", "cough", "headache", "side effect", 
            "safe to take", "interaction", "what should i do if", "missed dose"
        ]
        is_advisor = any(kw in prompt_lower for kw in advisor_keywords)

        if is_reminder:
            targets.append("ReminderAgent")
        
        if is_knowledge:
            targets.append("KnowledgeRetrievalAgent")
            
        if is_advisor:
            targets.append("HealthAdvisorAgent")

        # Default fallback: Route to HealthAdvisor and/or KnowledgeRetrieval
        if not targets:
            targets = ["HealthAdvisorAgent"]

        # De-duplicate
        return list(set(targets))
