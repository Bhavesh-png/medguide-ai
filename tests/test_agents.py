import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.orchestrator.router import Router

def test_emergency_override_detection():
    router = Router()
    
    # Check general non-emergency prompts
    assert router.detect_emergency("Hello, I need to check my calendar.") is False
    assert router.detect_emergency("Can you tell me about metformin side effects?") is False
    
    # Check emergency triggers
    assert router.detect_emergency("Help! I am having severe chest pain right now!") is True
    assert router.detect_emergency("My sister is having difficulty breathing.") is True
    assert router.detect_emergency("He fell down and has severe bleeding from his arm.") is True
    assert router.detect_emergency("I have suicidal thoughts.") is True

def test_intent_routing_classification():
    router = Router()
    
    # Emergency should route ONLY to Emergency agent
    emergency_routes = router.classify_intent("Help, chest pain!")
    assert emergency_routes == ["EmergencyEscalationAgent"]
    
    # Reminder query
    reminder_routes = router.classify_intent("Schedule my appointment with Dr. John next week")
    assert "ReminderAgent" in reminder_routes
    
    # Medical education query
    knowledge_routes = router.classify_intent("What is the WHO guidance on vaccine safety?")
    assert "KnowledgeRetrievalAgent" in knowledge_routes
