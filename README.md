# MedGuide AI: Privacy-First Healthcare Assistant

MedGuide AI is a production-ready, privacy-first healthcare coordination application powered by Google Antigravity. It orchestrates four specialized agents to help users manage medications, schedules, symptoms, and medical information safely.

---

## Features

- **Antigravity Orchestration**: Classifies, routes, and splits queries to coordinate specialized agents (Health Advisor, Reminder, Knowledge Retrieval, and Emergency Escalation) dynamically.
- **MCP Calendar Integration**: Connects to a custom stdio-based JSON-RPC Model Context Protocol Calendar Server to schedule health appointments and reminders.
- **Graceful Local Fallback**: Automatically switches scheduling actions to local-only SQLite buffers when calendar sharing consent is denied or the MCP server fails.
- **Granular Consent Management**: Privacy-first settings toggle permissions for calendar access, long-term chat history storage, and emergency contact alert capabilities.
- **Field-Level Encryption**: All patient medication names, calendar descriptions, and notes are encrypted using AES-256 Fernet tokens prior to saving to MongoDB.
- **Security Audit Logs**: Keeps write-only, compliance-ready logs of logins, encryption dispatches, consent edits, and emergency alerts.

---

## Repository Structure

```
medguide-ai/
├── backend/            # FastAPI Application Gateway
│   ├── app.py          # REST API endpoints & routing
│   ├── config.py       # Configuration loader
│   └── Dockerfile      # Backend Docker configuration
├── frontend/           # React + Vite Frontend client
│   ├── src/            # Components, styles, API clients
│   └── Dockerfile      # Frontend Docker configuration
├── agents/             # Specialized Agent definitions
│   ├── health_advisor/
│   ├── reminder/
│   ├── emergency/
│   └── knowledge/
│   └── orchestrator/   # Antigravity Orchestrator & Router
├── mcp/                # Model Context Protocol Calendar Server
│   ├── calendar_server.py
│   └── tools.py
├── security/           # Encryption, Auth, and Consent Manager
├── memory/             # In-memory and MongoDB session storage
├── tests/              # Pytest backend validation suites
└── docker-compose.yml  # Local multi-container deployment config
```

---

## Local Setup & Deployment

### Prerequisite
Ensure you have Docker and Docker Compose installed.

### Step 1: Clone and Enter the Directory
```bash
git clone https://github.com/yourusername/medguide-ai.git
cd medguide-ai
```

### Step 2: Configure Environment Variables
Copy the `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```
Generate an encryption key and a JWT secret, and paste them into `.env`:
```bash
# Generate key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Configure the following parameters in your `.env` file:
- `GEMINI_API_KEY`: Your Google Gemini API Key (leaves as-is to run in simulated mockup mode).
- `ENCRYPTION_KEY`: The base64 Fernet key generated above.
- `JWT_SECRET`: A secure random password for signing auth tokens.

### Step 3: Run the Application with Docker Compose
To build and start all containers (MongoDB, FastAPI, React Dev Client):
```bash
docker-compose up --build
```

- **Frontend client** is served on: `http://localhost:5173`
- **Backend gateway** is served on: `http://localhost:8000`

*Log in with username `admin` and password `admin` to bypass authentication in local development mode.*

---

## Manual Execution (Non-Docker)

If you prefer to run services manually on your host machine:

### 1. Launch FastAPI Backend:
```bash
python -m venv venv
# On Windows: venv\Scripts\activate
# On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python backend/app.py
```

### 2. Launch React Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Running Unit Tests

To run the compliance test suite:
```bash
pytest backend/tests/ -v
```
*Note: Make sure python dependencies are installed and the virtualenv is active.*
