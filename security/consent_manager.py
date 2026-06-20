import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Default consent settings
DEFAULT_CONSENT = {
    "calendar_access": False,
    "chat_history_storage": True,
    "emergency_escalation_data": False,
    "audit_logging": True
}

class ConsentManager:
    def __init__(self, db_client=None):
        self.db = db_client.get_database("medguide") if db_client else None
        self.collection = self.db.get_collection("user_consent") if self.db is not None else None

    async def get_consent(self, user_id: str) -> Dict[str, bool]:
        """Retrieve user consent settings. If none exist, returns default settings."""
        if self.collection is None:
            logger.warning("Database client not available. Returning default consents.")
            return DEFAULT_CONSENT.copy()
        
        try:
            doc = await self.collection.find_one({"user_id": user_id})
            if doc:
                # Merge defaults with custom to ensure all keys exist
                consent = DEFAULT_CONSENT.copy()
                consent.update(doc.get("consent", {}))
                return consent
        except Exception as e:
            logger.error(f"Error fetching consent for user {user_id}: {e}")
        
        return DEFAULT_CONSENT.copy()

    async def update_consent(self, user_id: str, updates: Dict[str, bool]) -> Dict[str, bool]:
        """Update user consent settings and log the change."""
        if self.collection is None:
            logger.warning("Database client not available. Consent update skipped.")
            return DEFAULT_CONSENT.copy()

        current_consent = await self.get_consent(user_id)
        current_consent.update(updates)

        try:
            await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "consent": current_consent,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            # Log audit for consent change
            audit_collection = self.db.get_collection("audit_logs")
            await audit_collection.insert_one({
                "user_id": user_id,
                "action": "consent_update",
                "details": updates,
                "timestamp": datetime.utcnow()
            })
            return current_consent
        except Exception as e:
            logger.error(f"Error updating consent for user {user_id}: {e}")
            raise ValueError("Failed to update consent settings")

    async def verify_consent(self, user_id: str, consent_type: str) -> bool:
        """Check if user has granted a specific consent type."""
        consent = await self.get_consent(user_id)
        return consent.get(consent_type, False)
