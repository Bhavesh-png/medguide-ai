import sys
import os
import pytest

# Add backend and parent directory to PYTHONPATH to load local modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from security.encryption import encrypt_data, decrypt_data
from security.auth import get_password_hash, verify_password, create_access_token

def test_encryption_decryption():
    secret_text = "Take Metformin 500mg daily"
    
    # Check encrypt
    enc_token = encrypt_data(secret_text)
    assert enc_token != secret_text
    
    # Check decrypt
    dec_text = decrypt_data(enc_token)
    assert dec_text == secret_text

def test_password_hashing():
    pwd = "supersecretpassword1"
    hashed = get_password_hash(pwd)
    
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_token_creation():
    payload = {"sub": "user_id_123", "username": "patient_bob"}
    token = create_access_token(payload)
    
    assert isinstance(token, str)
    assert len(token) > 20
