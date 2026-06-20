import sys
import os
import json
import subprocess
import logging
import sqlite3
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Fallback Local DB path if MCP sub-process communication fails
LOCAL_FALLBACK_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "local_fallback_reminders.db")

def init_fallback_db():
    conn = sqlite3.connect(LOCAL_FALLBACK_DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fallback_appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            time TEXT NOT NULL,
            frequency TEXT NOT NULL,
            description TEXT,
            sync_status TEXT DEFAULT 'sync_pending'
        )
    """)
    conn.commit()
    conn.close()

init_fallback_db()

class MCPCalendarClient:
    def __init__(self):
        self.server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "calendar_server.py")
        self.process = None

    def start_server(self) -> bool:
        """Launch the MCP Calendar Server as a background process using Python."""
        try:
            # Run calendar_server.py in standard subprocess mode
            self.process = subprocess.Popen(
                [sys.executable, self.server_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            logger.info("MCP Calendar Server subprocess started successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to start MCP Calendar Server subprocess: {e}")
            self.process = None
            return False

    def call_mcp_tool(self, tool_name: str, arguments: dict) -> Dict[str, Any]:
        """Perform a JSON-RPC tool invocation on the running MCP server.
        
        If it fails, runs local fallback actions.
        """
        # Attempt to run if not started
        if not self.process or self.process.poll() is not None:
            started = self.start_server()
            if not started:
                return self.execute_local_fallback(tool_name, arguments, "Failed to start MCP Server process.")

        req_id = 1
        rpc_request = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }

        try:
            # Write request to stdin
            req_str = json.dumps(rpc_request) + "\n"
            self.process.stdin.write(req_str)
            self.process.stdin.flush()

            # Read response from stdout (timeout-guarded)
            # In standard production, we would use select or asyncio,
            # but for this local module, readline works.
            res_str = self.process.stdout.readline()
            if not res_str:
                raise ValueError("Received empty stdout from MCP process")

            res_obj = json.loads(res_str)
            if "error" in res_obj:
                raise ValueError(res_obj["error"].get("message", "Unknown RPC error"))

            result_content = res_obj.get("result", {}).get("content", [])
            if result_content and result_content[0].get("type") == "text":
                parsed_res = json.loads(result_content[0]["text"])
                return {"status": "success", "source": "mcp_server", "data": parsed_res}
                
            raise ValueError("Unexpected response content structure")

        except Exception as e:
            logger.error(f"MCP tool call failed: {e}. Executing fallback database operation.")
            # Kill process if corrupted
            if self.process:
                try:
                    self.process.terminate()
                except Exception:
                    pass
                self.process = None
            return self.execute_local_fallback(tool_name, arguments, str(e))

    def execute_local_fallback(self, tool_name: str, arguments: dict, reason: str) -> Dict[str, Any]:
        """Execute operation against local fallback database (SQLite) if MCP process fails."""
        logger.warning(f"Executing offline fallback for tool: {tool_name} due to: {reason}")
        user_id = arguments.get("user_id")

        try:
            conn = sqlite3.connect(LOCAL_FALLBACK_DB)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if tool_name == "list_appointments":
                cursor.execute("SELECT * FROM fallback_appointments WHERE user_id = ?", (user_id,))
                rows = cursor.fetchall()
                conn.close()
                return {
                    "status": "success",
                    "source": "local_fallback_db",
                    "reason": reason,
                    "data": [dict(row) for row in rows]
                }

            elif tool_name == "create_appointment":
                cursor.execute("""
                    INSERT INTO fallback_appointments (user_id, title, time, frequency, description, sync_status)
                    VALUES (?, ?, ?, ?, ?, 'sync_pending')
                """, (
                    user_id,
                    arguments.get("title"),
                    arguments.get("time"),
                    arguments.get("frequency"),
                    arguments.get("description", "")
                ))
                conn.commit()
                inserted_id = cursor.lastrowid
                conn.close()
                return {
                    "status": "success",
                    "source": "local_fallback_db",
                    "reason": reason,
                    "data": {
                        "status": "success",
                        "id": inserted_id,
                        "title": arguments.get("title"),
                        "time": arguments.get("time"),
                        "sync_pending": True
                    }
                }

            elif tool_name == "delete_appointment":
                # Fallback delete
                app_id = arguments.get("appointment_id")
                cursor.execute("DELETE FROM fallback_appointments WHERE id = ? AND user_id = ?", (app_id, user_id))
                conn.commit()
                changes = conn.total_changes
                conn.close()
                if changes > 0:
                    return {
                        "status": "success",
                        "source": "local_fallback_db",
                        "reason": reason,
                        "data": {"status": "success", "message": f"Deleted fallback appointment {app_id}"}
                    }
                return {
                    "status": "error",
                    "source": "local_fallback_db",
                    "reason": reason,
                    "data": {"status": "error", "message": "Appointment not found in fallback"}
                }

        except Exception as err:
            logger.error(f"Fallback database operation failed: {err}")
            return {
                "status": "error",
                "source": "failed_completely",
                "reason": f"Fallback db failed: {err}"
            }
        
        return {"status": "error", "source": "unknown_tool", "reason": f"Tool {tool_name} not supported"}
