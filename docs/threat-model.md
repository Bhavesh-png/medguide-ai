# MedGuide AI Security and Threat Model

This document outlines security assumptions, threat classifications, mitigation controls, and privacy designs implemented in MedGuide AI.

---

## 1. Trust Boundaries

MedGuide AI handles sensitive healthcare data (medications, timings, appointments) which constitutes Protected Health Information (PHI) under HIPAA guidelines. 

Our architecture identifies four trust boundaries:
1. **User Browser -> FastAPI Gateway**: Transmitted over HTTPS (simulated locally). Protected by JWT authentication tokens.
2. **FastAPI -> MongoDB**: Secured via transport level encryption and local authentication credentials. Sensitive fields are encrypted before writing.
3. **FastAPI -> MCP Calendar (Subprocess)**: Operates over stdio inside the secure container space. If calendar consent is revoked, communication is blocked.
4. **FastAPI -> Gemini API (External)**: Requests are dispatched to Google Gemini APIs over TLS. Prompt content is minimized to protect PII.

---

## 2. Threat Vector Matrix

| Threat ID | Threat Category | Threat Scenario | Mitigation Control |
| :--- | :--- | :--- | :--- |
| **TM-001** | Information Disclosure | Unauthorized access to local MongoDB database files exposes medication regimes. | **Field Level Encryption**: Medication names and descriptions are encrypted using AES-256 Fernet tokens prior to persistence. |
| **TM-002** | Tampering / Spying | Malware on host intercepts HTTP calls between browser client and server. | **SSL/TLS & Token Auth**: Session authorization is verified using salted and signed HS256 JWT tokens. |
| **TM-003** | Privacy Breach | Shared calendaring services leak appointment and health status. | **Granular Consent Settings**: Calendar tool requests are blocked and routed to SQLite unless the user explicitly grants `calendar_access` consent. |
| **TM-004** | Medical Liability | AI gives dangerous diagnostics or dosing alterations. | **Guardrail Prompting & Base Checks**: Strict system instructions prevent diagnosing or dosing. Emergency triggers override LLM flows to direct users to emergency services. |

---

## 3. Compliance and Auditing

To maintain accountability, every user consent change, login, and scheduling modification triggers a write-only entry in our MongoDB `audit_logs` collection. These logs are displayed transparently to users in the Audit Log Explorer.
