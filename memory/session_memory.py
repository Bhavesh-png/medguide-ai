import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# In-memory store for sessions that did not consent to database storage
_in_memory_sessions: Dict[str, List[Dict[str, Any]]] = {}

class SessionMemory:
    def __init__(self, db_client=None, consent_manager=None):
        self.db = db_client.get_database("medguide") if db_client else None
        self.collection = self.db.get_collection("conversations") if self.db is not None else None
        self.consent_manager = consent_manager

    async def get_history(self, user_id: str, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch latest N messages for a session. Resolves from DB or memory depending on consent."""
        # Check consent
        has_consent = False
        if self.consent_manager:
            has_consent = await self.consent_manager.verify_consent(user_id, "chat_history_storage")

        if not has_consent:
            logger.info(f"Retrieving in-memory history for session {session_id} (No storage consent).")
            return _in_memory_sessions.get(session_id, [])[-limit:]

        if self.collection is None:
            return []

        try:
            cursor = self.collection.find(
                {"user_id": user_id, "session_id": session_id}
            ).sort("timestamp", 1).limit(limit)
            
            history = []
            async for doc in cursor:
                history.append({
                    "role": doc.get("role"),
                    "content": doc.get("content"),
                    "timestamp": doc.get("timestamp").isoformat() if doc.get("timestamp") else None
                })
            return history
        except Exception as e:
            logger.error(f"Error fetching conversation history: {e}")
            return []

    async def add_message(self, user_id: str, session_id: str, role: str, content: str) -> None:
        """Add a message to the conversation history. Saves to DB if user gave consent, otherwise in-memory."""
        # Check consent
        has_consent = False
        if self.consent_manager:
            has_consent = await self.consent_manager.verify_consent(user_id, "chat_history_storage")

        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }

        if not has_consent:
            logger.info(f"Storing message in-memory for session {session_id} (No storage consent).")
            if session_id not in _in_memory_sessions:
                _in_memory_sessions[session_id] = []
            _in_memory_sessions[session_id].append(message)
            return

        if self.collection is None:
            return

        try:
            await self.collection.insert_one({
                "user_id": user_id,
                "session_id": session_id,
                "role": role,
                "content": content,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Error saving message to database: {e}")

    async def clear_session(self, user_id: str, session_id: str) -> None:
        """Clear conversation history for a session."""
        if session_id in _in_memory_sessions:
            del _in_memory_sessions[session_id]

        if self.collection is not None:
            try:
                await self.collection.delete_many({"user_id": user_id, "session_id": session_id})
                # Log audit log
                if self.db is not None:
                    await self.db.get_collection("audit_logs").insert_one({
                        "user_id": user_id,
                        "action": "clear_chat_history",
                        "details": {"session_id": session_id},
                        "timestamp": datetime.utcnow()
                    })
            except Exception as e:
                logger.error(f"Error deleting conversation history: {e}")
