# MedGuide AI Agents and Orchestrator Design

This document details the multi-agent design of MedGuide AI. It defines the responsibilities, routing logic, safety protocols, and coordination guidelines for the Antigravity Orchestrator and the specialized healthcare agents.

---

## 1. Architecture Overview

MedGuide AI uses a hybrid routing and multi-agent execution pattern. The entry point of all queries is the **Antigravity Orchestrator**, which manages session memory, evaluates user consents, routes subtasks to targeted agents, and merges collaborative outputs.

```
                  ┌─────────────────────────────┐
                  │   Antigravity Orchestrator  │
                  └──────────────┬──────────────┘
                                 │ (Intent Routing & Pre-check)
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Health Advisor  │   │  Reminder Agent  │   │ Knowledge Agent  │
└──────────────────┘   └─────────┬────────┘   └──────────────────┘
                                 │
                                 ▼ (Writes Schedules)
                       ┌──────────────────┐
                       │   MCP Calendar   │
                       └──────────────────┘
                                 ▲
                                 │ (Fallback SQLite DB)
                       ┌──────────────────┐
                       │  Local Sandbox   │
                       └──────────────────┘
```

---

## 2. Agent Catalog

### A. Health Advisor Agent
- **Role**: Explains medical terms, symptoms, and medication actions in plain language.
- **Rules**:
  - **No Diagnosis**: Never claim the user has a specific condition. Explain symptoms generally (e.g. \"Headaches can be caused by eye strain, hydration issues, etc.\") but always recommend professional checkups.
  - **No Prescriptions/Dosing**: Never tell users how much of a medication to take or alter their schedule.
- **Prompts**: Defined in `agents/health_advisor/prompts.py`.

### B. Reminder Agent
- **Role**: Schedules medication reminders and doctor appointments.
- **Output**: Generates structured JSON instructions in markdown code blocks (` ```json ... ``` `).
- **Execution Tool**: Calls MCP Calendar Server tools.
- **Privacy Enforcement**: Verifies if the user has toggled the `calendar_access` consent. If disabled, it automatically falls back to local sqlite database reminders.
- **Prompts**: Defined in `agents/reminder/prompts.py`.

### C. Knowledge Retrieval Agent
- **Role**: Fetches and translates structured health info.
- **Sources**: Strictly restricted to:
  - World Health Organization (WHO)
  - Centers for Disease Control and Prevention (CDC)
  - National Institutes of Health (NIH)
- **Formatting**: Always formats outputs with verifiable references and source citations.
- **Prompts**: Defined in `agents/knowledge/prompts.py`.

### D. Emergency Escalation Agent
- **Role**: Immediate intervention when life-threatening symptoms are reported.
- **Safety Priority**: Overrules all other agents. If emergency keywords are matched, the orchestrator bypasses standard workflows and invokes this agent exclusively.
- **Triggers**:
  - "chest pain", "difficulty breathing", "severe bleeding", "loss of consciousness", "stroke symptoms", "suicidal thoughts".
- **Prompts**: Defined in `agents/emergency/prompts.py`.

---

## 3. Orchestration & Coordination Workflows

### Session Context
Short-term history is fetched by the orchestrator and sent as context to Gemini. Transcripts are saved permanently in MongoDB **only** if the user enables the `chat_history_storage` consent flag. If disabled, they are stored in a transient Python dictionary that is wiped upon closing.

### Failure Recovery Rules
1. **MCP Client Failures**: The MCP server is launched as a Python subprocess communicating over stdio. If communication fails, throws an error, or times out, the client automatically catches it, logs a compliance warning, and writes the appointment to `local_fallback_reminders.db`.
2. **Offline Mode Badges**: When the client falls back to the local database, it sets `source="local_fallback"` which is rendered in the frontend as a visual warning: "Local Offline Fallback database".
