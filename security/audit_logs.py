import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger("medguide.audit")

class AuditLogger:
    def __init__(self, db_client=None):
        self.db = db_client.get_database("medguide") if db_client else None
        self.collection = self.db.get_collection("audit_logs") if self.db is not None else None

    async def log_action(self, user_id: str, action: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Log a user activity in the audit logs collection and syslogs."""
        timestamp = datetime.utcnow()
        details_str = str(details) if details else ""
        
        # Log to Python standard log
        logger.info(f"AUDIT - [{timestamp.isoformat()}] User: {user_id} - Action: {action} - Details: {details_str}")
        
        if self.collection is not None:
            try:
                await self.collection.insert_one({
                    "user_id": user_id,
                    "action": action,
                    "details": details or {},
                    "timestamp": timestamp
                })
            except Exception as e:
                logger.error(f"Failed to write audit log to database: {e}")
                
    async def get_logs(self, user_id: str, limit: int = 50) -> list:
        """Retrieve audit logs for a given user. Used for transparency display."""
        if self.collection is None:
            return []
        try:
            cursor = self.collection.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
            logs = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                logs.append(doc)
            return logs
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            return []
