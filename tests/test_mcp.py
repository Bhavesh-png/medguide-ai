import sys
import os
import pytest
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.tools import MCPCalendarClient, LOCAL_FALLBACK_DB

def test_local_fallback_db_operations():
    client = MCPCalendarClient()
    
    # Trigger offline fallback creation
    args = {
        "user_id": "test_user_777",
        "title": "Encrypted Title Here",
        "time": "2026-06-25T14:00:00",
        "frequency": "one-time",
        "description": "Encrypted description notes"
    }
    
    res = client.execute_local_fallback("create_appointment", args, "Testing fallback channel")
    assert res["status"] == "success"
    assert res["source"] == "local_fallback_db"
    assert res["data"]["title"] == "Encrypted Title Here"
    
    # Query appointments
    query_res = client.execute_local_fallback("list_appointments", {"user_id": "test_user_777"}, "Testing query fallback")
    assert query_res["status"] == "success"
    appointments = query_res["data"]
    assert len(appointments) >= 1
    
    # Clean up test records
    conn = sqlite3.connect(LOCAL_FALLBACK_DB)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fallback_appointments WHERE user_id = ?", ("test_user_777",))
    conn.commit()
    conn.close()
