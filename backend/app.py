import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# Local module imports
from backend.config import settings
from security.auth import get_password_hash, verify_password, create_access_token, get_current_user
from security.encryption import encrypt_data, decrypt_data
from security.consent_manager import ConsentManager
from security.audit_logs import AuditLogger
from memory.session_memory import SessionMemory
from agents.orchestrator.antigravity import AntigravityOrchestrator
from mcp.tools import MCPCalendarClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medguide.backend")

app = FastAPI(title="MedGuide AI Gateway API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# App State Globals
db_client: Optional[AsyncIOMotorClient] = None
consent_manager: Optional[ConsentManager] = None
audit_logger: Optional[AuditLogger] = None
session_memory: Optional[SessionMemory] = None
mcp_client: Optional[MCPCalendarClient] = None
orchestrator: Optional[AntigravityOrchestrator] = None

@app.on_event("startup")
async def startup_db_client():
    global db_client, consent_manager, audit_logger, session_memory, mcp_client, orchestrator
    logger.info("Initializing services on startup...")
    
    # Init DB client
    try:
        db_client = AsyncIOMotorClient(settings.mongodb_uri)
        # Verify connection
        await db_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}. Running with mock database settings.")
        db_client = None

    # Init modules
    consent_manager = ConsentManager(db_client)
    audit_logger = AuditLogger(db_client)
    session_memory = SessionMemory(db_client, consent_manager)
    mcp_client = MCPCalendarClient()
    
    # Start the MCP Calendar process
    mcp_client.start_server()

    # Init Orchestrator
    orchestrator = AntigravityOrchestrator(
        db_client=db_client,
        mcp_client=mcp_client,
        consent_manager=consent_manager,
        audit_logger=audit_logger,
        memory=session_memory
    )

@app.on_event("shutdown")
async def shutdown_db_client():
    global db_client, mcp_client
    logger.info("Shutting down services...")
    if db_client:
        db_client.close()
    if mcp_client and mcp_client.process:
        try:
            mcp_client.process.terminate()
        except Exception:
            pass

# Pydantic Schemas
class RegisterSchema(BaseModel):
    username: str
    password: str

class LoginSchema(BaseModel):
    username: str
    password: str

class ChatQuerySchema(BaseModel):
    session_id: str
    prompt: str

class ConsentUpdateSchema(BaseModel):
    updates: Dict[str, bool]

class AppointmentCreateSchema(BaseModel):
    title: str
    time: str
    frequency: str = "one-time"
    description: str = ""

# Authentication Endpoints
@app.post("/api/auth/register", status_code=201)
async def register(user: RegisterSchema):
    if not db_client:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    db = db_client.get_database("medguide")
    users = db.get_collection("users")
    
    # Check if user already exists
    existing = await users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    hashed_pwd = get_password_hash(user.password)
    new_user = {
        "username": user.username,
        "hashed_password": hashed_pwd,
        "created_at": datetime.utcnow()
    }
    
    await users.insert_one(new_user)
    
    # Set default consents
    await consent_manager.update_consent(user.username, {
        "calendar_access": False,
        "chat_history_storage": True,
        "emergency_escalation_data": False,
        "audit_logging": True
    })
    
    await audit_logger.log_action(user.username, "user_registration", {"username": user.username})
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
async def login(user: LoginSchema):
    if not db_client:
        # Development mode bypass if DB fails
        if user.username == "admin" and user.password == "admin":
            token = create_access_token({"sub": "admin", "username": "admin"})
            return {"access_token": token, "token_type": "bearer", "username": "admin"}
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    db = db_client.get_database("medguide")
    users = db.get_collection("users")
    
    existing = await users.find_one({"username": user.username})
    if not existing or not verify_password(user.password, existing["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    token = create_access_token({"sub": str(existing["_id"]), "username": user.username})
    await audit_logger.log_action(user.username, "user_login")
    return {"access_token": token, "token_type": "bearer", "username": user.username}

# User Profile & Consent Endpoints
@app.get("/api/user/me")
async def read_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/user/consent")
async def get_consent(current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    consents = await consent_manager.get_consent(user_id)
    return consents

@app.post("/api/user/consent")
async def update_consent(body: ConsentUpdateSchema, current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    updated = await consent_manager.update_consent(user_id, body.updates)
    await audit_logger.log_action(user_id, "consent_change", body.updates)
    return {"message": "Consent settings updated successfully", "consent": updated}

@app.get("/api/user/audit-logs")
async def get_audits(current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    logs = await audit_logger.get_logs(user_id)
    return logs

# Chat Orchestration Endpoints
@app.post("/api/chat")
async def chat_interaction(body: ChatQuerySchema, current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    
    # Process request using Antigravity Orchestrator
    try:
        response = await orchestrator.process_query(user_id, body.session_id, body.prompt)
    except Exception as e:
        logger.error(f"Orchestration failure: {e}")
        raise HTTPException(status_code=500, detail=f"Orchestrator encountered error: {e}")
        
    # Execute any actions returned by agents (e.g. Schedule reminders)
    executed_logs = []
    actions = response.get("actions", [])
    
    for action in actions:
        if action["type"] == "schedule_reminder":
            params = action["params"]
            consent_granted = params.get("consent_granted", False)
            
            # Enforce encryption on calendar data (title/details) before external dispatch or storage
            raw_title = params.get("title", "")
            raw_description = params.get("description", "")
            
            try:
                encrypted_title = encrypt_data(raw_title)
                encrypted_description = encrypt_data(raw_description)
                
                # Check calendar consent
                if consent_granted:
                    # Invoke MCP tool
                    mcp_res = mcp_client.call_mcp_tool(
                        "create_appointment",
                        {
                            "user_id": user_id,
                            "title": encrypted_title,
                            "time": params.get("time"),
                            "frequency": params.get("frequency"),
                            "description": encrypted_description
                        }
                    )
                    
                    source = mcp_res.get("source", "mcp_server")
                    if source == "local_fallback_db":
                        executed_logs.append(f"[{datetime.utcnow().isoformat()}] MCP Calendar Server failed. Gracefully saved schedule offline in local fallback database.")
                    else:
                        executed_logs.append(f"[{datetime.utcnow().isoformat()}] Appointment successfully scheduled via MCP Calendar server.")
                        
                    # Audit event creation
                    await audit_logger.log_action(user_id, "schedule_created", {
                        "type": params.get("reminder_type"), 
                        "source": source,
                        "time": params.get("time")
                    })
                else:
                    # Forced fallback due to privacy restrictions (No consent for calendar server sharing)
                    fallback_res = mcp_client.execute_local_fallback(
                        "create_appointment",
                        {
                            "user_id": user_id,
                            "title": encrypted_title,
                            "time": params.get("time"),
                            "frequency": params.get("frequency"),
                            "description": encrypted_description
                        },
                        reason="No calendar access consent. Scheduled strictly in local-only fallback mode."
                    )
                    executed_logs.append(f"[{datetime.utcnow().isoformat()}] Calendar sharing consent restricted. Scheduled event in local-only database.")
                    
                    # Audit event creation
                    await audit_logger.log_action(user_id, "schedule_created_offline", {
                        "type": params.get("reminder_type"),
                        "time": params.get("time")
                    })
                    
            except Exception as enc_err:
                logger.error(f"Failed to encrypt and schedule reminder: {enc_err}")
                executed_logs.append(f"[{datetime.utcnow().isoformat()}] Failed to encrypt and schedule appointment details: {enc_err}")

    # Append any backend execution reasoning traces to response
    if executed_logs:
        response["reasoning_logs"].extend(executed_logs)
        
    return response

@app.post("/api/chat/clear")
async def clear_chat(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    await session_memory.clear_session(user_id, session_id)
    return {"message": "Chat history cleared successfully"}

# Appointment & Calendar list endpoints
@app.get("/api/calendar")
async def list_calendar(current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    
    # Read both MCP Calendar and Fallback Database to show user a unified schedule
    mcp_res = mcp_client.call_mcp_tool("list_appointments", {"user_id": user_id})
    fallback_res = mcp_client.execute_local_fallback("list_appointments", {"user_id": user_id}, "Querying local backup store.")
    
    all_appointments = []
    
    def process_apppts(items, src):
        for item in items:
            try:
                decrypted_title = decrypt_data(item.get("title", ""))
                decrypted_desc = decrypt_data(item.get("description", ""))
            except Exception:
                # Decryption failure fallback (could be cleartext saved before key setting)
                decrypted_title = item.get("title", "")
                decrypted_desc = item.get("description", "")
                
            all_appointments.append({
                "id": item.get("id"),
                "title": decrypted_title,
                "time": item.get("time"),
                "frequency": item.get("frequency"),
                "description": decrypted_desc,
                "source": src,
                "sync_status": item.get("sync_status", "synchronized")
            })

    if mcp_res.get("status") == "success":
        process_apppts(mcp_res.get("data", []), "mcp_calendar")
        
    if fallback_res.get("status") == "success":
        process_apppts(fallback_res.get("data", []), "local_fallback")
        
    return all_appointments

@app.post("/api/calendar")
async def create_calendar_item(item: AppointmentCreateSchema, current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    
    # Check consent
    can_schedule = await consent_manager.verify_consent(user_id, "calendar_access")
    
    # Encrypt details
    enc_title = encrypt_data(item.title)
    enc_desc = encrypt_data(item.description)
    
    if can_schedule:
        res = mcp_client.call_mcp_tool(
            "create_appointment",
            {
                "user_id": user_id,
                "title": enc_title,
                "time": item.time,
                "frequency": item.frequency,
                "description": enc_desc
            }
        )
    else:
        res = mcp_client.execute_local_fallback(
            "create_appointment",
            {
                "user_id": user_id,
                "title": enc_title,
                "time": item.time,
                "frequency": item.frequency,
                "description": enc_desc
            },
            reason="User manual scheduler - Restricted Consent"
        )
        
    if res.get("status") == "success":
        await audit_logger.log_action(user_id, "manual_appointment_created", {"time": item.time})
        return {"status": "success", "message": "Appointment created", "data": res.get("data")}
        
    raise HTTPException(status_code=500, detail="Failed to create appointment")

@app.delete("/api/calendar/{source}/{item_id}")
async def delete_calendar_item(source: str, item_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    
    if source == "mcp_calendar":
        res = mcp_client.call_mcp_tool(
            "delete_appointment",
            {"appointment_id": item_id, "user_id": user_id}
        )
    else:
        res = mcp_client.execute_local_fallback(
            "delete_appointment",
            {"appointment_id": item_id, "user_id": user_id},
            reason="User deleting fallback reminder"
        )
        
    if res.get("status") == "success":
        await audit_logger.log_action(user_id, "appointment_deleted", {"item_id": item_id, "source": source})
        return {"status": "success", "message": "Appointment deleted"}
        
    raise HTTPException(status_code=400, detail="Failed to delete appointment")

# Active Medications list (derived from schedule events)
@app.get("/api/medications")
async def list_medications(current_user: dict = Depends(get_current_user)):
    user_id = current_user["username"]
    
    # We retrieve all schedule events and filter those containing medication keywords
    # to form a running profile of their active therapies.
    mcp_res = mcp_client.call_mcp_tool("list_appointments", {"user_id": user_id})
    fallback_res = mcp_client.execute_local_fallback("list_appointments", {"user_id": user_id}, "Querying local backup store.")
    
    medications = []
    seen = set()
    
    def parse_meds(items):
        for item in items:
            try:
                decrypted_title = decrypt_data(item.get("title", ""))
                decrypted_desc = decrypt_data(item.get("description", ""))
            except Exception:
                decrypted_title = item.get("title", "")
                decrypted_desc = item.get("description", "")
                
            title_lower = decrypted_title.lower()
            # If item matches common medication verbs or names, group it
            if any(term in title_lower for term in ["take", "medication", "pill", "mg", "tablet", "insulin", "dose"]):
                med_key = (decrypted_title, item.get("time"), item.get("frequency"))
                if med_key not in seen:
                    seen.add(med_key)
                    medications.append({
                        "name": decrypted_title,
                        "time": item.get("time"),
                        "frequency": item.get("frequency"),
                        "description": decrypted_desc
                    })

    if mcp_res.get("status") == "success":
        parse_meds(mcp_res.get("data", []))
    if fallback_res.get("status") == "success":
        parse_meds(fallback_res.get("data", []))
        
    return medications

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
