import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from agents.orchestrator.router import Router
from agents.health_advisor.agent import HealthAdvisorAgent
from agents.reminder.agent import ReminderAgent
from agents.emergency.agent import EmergencyEscalationAgent
from agents.knowledge.agent import KnowledgeRetrievalAgent
from security.consent_manager import ConsentManager
from security.audit_logs import AuditLogger
from memory.session_memory import SessionMemory

logger = logging.getLogger(__name__)

class AntigravityOrchestrator:
    def __init__(
        self,
        db_client=None,
        mcp_client=None,
        consent_manager: Optional[ConsentManager] = None,
        audit_logger: Optional[AuditLogger] = None,
        memory: Optional[SessionMemory] = None
    ):
        self.db = db_client.get_database("medguide") if db_client else None
        self.router = Router()
        
        # Initialize agents
        self.health_advisor = HealthAdvisorAgent()
        self.reminder_agent = ReminderAgent(mcp_client=mcp_client, db_client=db_client)
        self.emergency_agent = EmergencyEscalationAgent()
        self.knowledge_agent = KnowledgeRetrievalAgent()
        
        self.consent_manager = consent_manager
        self.audit_logger = audit_logger
        self.memory = memory

    async def process_query(self, user_id: str, session_id: str, prompt: str) -> Dict[str, Any]:
        """Main orchestrator route that processes user requests, executes agents, and returns a unified response."""
        logger.info(f"Orchestrating request for user {user_id}, session {session_id}")
        
        # 1. Start reasoning logs trace
        reasoning_logs = [
            f"[{datetime.utcnow().isoformat()}] Received user request: '{prompt}'",
            f"[{datetime.utcnow().isoformat()}] Fetching conversation history context..."
        ]
        
        # Retrieve history if user consented
        history = []
        if self.memory:
            history = await self.memory.get_history(user_id, session_id)
            reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] History context loaded ({len(history)} messages).")
            
        # 2. Route user request
        routed_agents = self.router.classify_intent(prompt)
        reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] Router classified targets: {routed_agents}")
        
        # Audit log classification action
        if self.audit_logger:
            await self.audit_logger.log_action(user_id, "query_routing", {"prompt": prompt, "routes": routed_agents})
            
        # 3. Handle emergencies immediately (absolute override)
        if "EmergencyEscalationAgent" in routed_agents:
            reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] 🚨 EMERGENCY DETECTED. Halting other agent workflows.")
            res = await self.emergency_agent.run(user_id, prompt, history)
            
            # Save message history
            if self.memory:
                await self.memory.add_message(user_id, session_id, "user", prompt)
                await self.memory.add_message(user_id, session_id, "assistant", res["text"])
                
            return {
                "text": res["text"],
                "active_agent": "EmergencyEscalationAgent",
                "reasoning_logs": reasoning_logs,
                "actions": res["actions"],
                "data": res["data"]
            }

        # 4. Multi-agent execution in parallel
        async def execute_agent(agent_name: str) -> Dict[str, Any]:
            if agent_name == "ReminderAgent":
                can_schedule = True
                if self.consent_manager:
                    can_schedule = await self.consent_manager.verify_consent(user_id, "calendar_access")
                
                res = await self.reminder_agent.run(user_id, prompt, history)
                if res.get("actions"):
                    for act in res["actions"]:
                        if act["type"] == "schedule_reminder":
                            act["params"]["consent_granted"] = can_schedule
                return {
                    "name": agent_name,
                    "text": res.get("text", ""),
                    "actions": res.get("actions") or [],
                    "data": res.get("data") or {},
                    "log": f"Warning: Calendar access consent not granted. Scheduling will run in local-only fallback mode." if not can_schedule else None
                }
            elif agent_name == "KnowledgeRetrievalAgent":
                res = await self.knowledge_agent.run(user_id, prompt, history)
                return {
                    "name": agent_name,
                    "text": res.get("text", ""),
                    "actions": res.get("actions") or [],
                    "data": res.get("data") or {},
                    "log": None
                }
            elif agent_name == "HealthAdvisorAgent":
                res = await self.health_advisor.run(user_id, prompt, history)
                return {
                    "name": agent_name,
                    "text": res.get("text", ""),
                    "actions": res.get("actions") or [],
                    "data": res.get("data") or {},
                    "log": None
                }
            return {"name": agent_name, "text": "", "actions": [], "data": {}, "log": None}

        agent_responses = []
        actions = []
        parsed_data = {}

        if routed_agents:
            reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] Dispatching collaborative agents in parallel...")
            import asyncio
            tasks = [execute_agent(name) for name in routed_agents]
            results = await asyncio.gather(*tasks)
            
            for res in results:
                reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] Completed executing agent: {res['name']}")
                if res["log"]:
                    reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] {res['log']}")
                if res["text"]:
                    agent_responses.append(res["text"])
                if res["actions"]:
                    actions.extend(res["actions"])
                if res["data"]:
                    parsed_data.update(res["data"])

        # 5. Merge agent responses transparently
        if len(agent_responses) > 1:
            reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] Merging responses from multiple collaborative agents.")
            merged_text = "\n\n---\n\n".join(agent_responses)
        elif agent_responses:
            merged_text = agent_responses[0]
        else:
            merged_text = "I'm sorry, I was unable to determine a response strategy. How can I help you today?"
            
        # 6. Save message history
        if self.memory:
            await self.memory.add_message(user_id, session_id, "user", prompt)
            await self.memory.add_message(user_id, session_id, "assistant", merged_text)
            reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] Conversation history updated.")

        reasoning_logs.append(f"[{datetime.utcnow().isoformat()}] Orchestration workflow completed.")

        # Determine active agent label
        active_agent_label = " + ".join(routed_agents) if routed_agents else "Orchestrator"

        return {
            "text": merged_text,
            "active_agent": active_agent_label,
            "reasoning_logs": reasoning_logs,
            "actions": actions,
            "data": parsed_data
        }
