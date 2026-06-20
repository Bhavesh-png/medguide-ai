import sys
import json
import sqlite3
import os
import logging
from datetime import datetime

# Setup basic logging to stderr since stdout is used for JSON-RPC
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mcp_calendar_server")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_calendar.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            time TEXT NOT NULL,
            frequency TEXT NOT NULL,
            description TEXT
        )
    """)
    conn.commit()
    conn.close()

def list_appointments(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_appointment(user_id: str, title: str, time: str, frequency: str, description: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments (user_id, title, time, frequency, description)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, title, time, frequency, description))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return {"status": "success", "id": inserted_id, "title": title, "time": time}

def delete_appointment(appointment_id: int, user_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE id = ? AND user_id = ?", (appointment_id, user_id))
    conn.commit()
    changes = conn.total_changes
    conn.close()
    if changes > 0:
        return {"status": "success", "message": f"Deleted appointment {appointment_id}"}
    return {"status": "error", "message": f"Appointment {appointment_id} not found"}

def handle_request(req_str: str) -> str:
    try:
        request = json.loads(req_str)
    except Exception as e:
        return json.dumps({"jsonrpc": "2.0", "error": {"code": -32700, "message": f"Parse error: {e}"}, "id": None})

    req_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})

    logger.info(f"Received request method: {method}")

    # Standard MCP Handshake
    if method == "initialize":
        return json.dumps({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "mcp-calendar-server",
                    "version": "1.0.0"
                }
            }
        })
        
    elif method == "tools/list" or method == "listTools":
        return json.dumps({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "list_appointments",
                        "description": "List all scheduled appointments for a user",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "user_id": {"type": "string"}
                            },
                            "required": ["user_id"]
                        }
                    },
                    {
                        "name": "create_appointment",
                        "description": "Schedule a new appointment or medication timing",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "user_id": {"type": "string"},
                                "title": {"type": "string"},
                                "time": {"type": "string", "description": "ISO date-time or 24h clock string"},
                                "frequency": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["user_id", "title", "time", "frequency"]
                        }
                    },
                    {
                        "name": "delete_appointment",
                        "description": "Delete an existing scheduled appointment",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "appointment_id": {"type": "integer"},
                                "user_id": {"type": "string"}
                            },
                            "required": ["appointment_id", "user_id"]
                        }
                    }
                ]
            }
        })
        
    elif method == "tools/call" or method == "callTool":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        logger.info(f"Calling tool: {tool_name} with args: {arguments}")
        
        try:
            if tool_name == "list_appointments":
                res = list_appointments(arguments.get("user_id"))
            elif tool_name == "create_appointment":
                res = create_appointment(
                    user_id=arguments.get("user_id"),
                    title=arguments.get("title"),
                    time=arguments.get("time"),
                    frequency=arguments.get("frequency"),
                    description=arguments.get("description", "")
                )
            elif tool_name == "delete_appointment":
                res = delete_appointment(
                    appointment_id=int(arguments.get("appointment_id")),
                    user_id=arguments.get("user_id")
                )
            else:
                return json.dumps({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method not found: {tool_name}"}
                })
                
            return json.dumps({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(res)
                        }
                    ]
                }
            })
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return json.dumps({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": f"Internal error during execution: {e}"}
            })

    return json.dumps({
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"}
    })

def main():
    init_db()
    logger.info("MCP Calendar Server started and DB initialized.")
    
    # Simple line-oriented JSON-RPC server loop over stdin/stdout
    try:
        for line in sys.stdin:
            if not line.strip():
                continue
            response = handle_request(line)
            sys.stdout.write(response + "\n")
            sys.stdout.flush()
    except KeyboardInterrupt:
        logger.info("Exiting on KeyboardInterrupt")
    except Exception as e:
        logger.error(f"Crash in server loop: {e}")

if __name__ == "__main__":
    main()
