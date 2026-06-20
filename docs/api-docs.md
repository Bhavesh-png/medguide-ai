# MedGuide AI API Documentation

This document describes the REST API endpoints provided by the MedGuide AI FastAPI gateway.

---

## 1. Authentication Endpoints

### Register User
* **URL**: `/api/auth/register`
* **Method**: `POST`
* **Payload**:
  ```json
  {
    "username": "patient1",
    "password": "securepassword"
  }
  ```
* **Response**: `201 Created`
  ```json
  {
    "message": "User registered successfully"
  }
  ```

### Login User
* **URL**: `/api/auth/login`
* **Method**: `POST`
* **Payload**:
  ```json
  {
    "username": "patient1",
    "password": "securepassword"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "access_token": "jwt_token_string",
    "token_type": "bearer",
    "username": "patient1"
  }
  ```

---

## 2. Privacy & Consent Endpoints

### Get Consent Profile
* **URL**: `/api/user/consent`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`
* **Response**: `200 OK`
  ```json
  {
    "calendar_access": false,
    "chat_history_storage": true,
    "emergency_escalation_data": false,
    "audit_logging": true
  }
  ```

### Update Consent Profile
* **URL**: `/api/user/consent`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**:
  ```json
  {
    "updates": {
      "calendar_access": true
    }
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "message": "Consent settings updated successfully",
    "consent": {
      "calendar_access": true,
      "chat_history_storage": true,
      "emergency_escalation_data": false,
      "audit_logging": true
    }
  }
  ```

---

## 3. Chat & Agent Orchestration

### Interact with Orchestrator
* **URL**: `/api/chat`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**:
  ```json
  {
    "session_id": "sess_123456",
    "prompt": "I forgot my diabetes medicine and need to see my doctor next week."
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "text": "Answer from agent...",
    "active_agent": "ReminderAgent + HealthAdvisorAgent",
    "reasoning_logs": [
      "[2026-06-20T14:00:00.000] Received user request...",
      "[2026-06-20T14:00:00.100] Router classified targets..."
    ],
    "actions": [
      {
        "type": "schedule_reminder",
        "params": {
          "intent": "create_reminder",
          "reminder_type": "medication",
          "title": "Diabetes Medicine",
          "time": "08:00",
          "frequency": "daily"
        }
      }
    ],
    "data": {}
  }
  ```

---

## 4. Calendar & Scheduling Endpoints

### List Appointments
* **URL**: `/api/calendar`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`
* **Response**: `200 OK` (returns decrypted records)

### Create Appointment
* **URL**: `/api/calendar`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**:
  ```json
  {
    "title": "Consult Cardiologist",
    "time": "2026-06-27T10:00:00",
    "frequency": "one-time",
    "description": "Heart checkup notes"
  }
  ```

### Delete Appointment
* **URL**: `/api/calendar/{source}/{item_id}`
* **Method**: `DELETE`
* **Headers**: `Authorization: Bearer <token>`
