import os
import logging
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

logger = logging.getLogger(__name__)

# Fetch key from environment or generate a fallback key for local dev
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    logger.warning("ENCRYPTION_KEY not set. Generating a temporary local key for this run.")
    ENCRYPTION_KEY = Fernet.generate_key().decode()

try:
    cipher = Fernet(ENCRYPTION_KEY.encode())
except Exception as e:
    logger.error(f"Invalid ENCRYPTION_KEY format. Error: {e}. Generating new temporary key.")
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_data(data: str) -> str:
    """Encrypt a string and return the base64-encoded encrypted token."""
    if not data:
        return ""
    try:
        return cipher.encrypt(data.encode()).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise ValueError("Failed to encrypt data")

def decrypt_data(token: str) -> str:
    """Decrypt a base64-encoded encrypted token back to cleartext string."""
    if not token:
        return ""
    try:
        return cipher.decrypt(token.encode()).decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError("Failed to decrypt data. Invalid key or corrupted data.")
