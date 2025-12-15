
import sys
import os
import json

# Add project root to path
sys.path.append(os.getcwd())

try:
    from backend.services.google_sheets import gs
    print("Successfully imported gs")
    
    # Simulate data
    ev = {
        "ID": "TEST_DEBUG_1",
        "Name": "Debug Event",
        "Auditorium": "Main Auditorium",
        "Featured": "true",
        "Schedules": '[{"Date": "2025-12-25", "Time": "10:00"}]',
        "SeatLayout": "{}",
        "Poster": "http://example.com/img.jpg"
    }
    
    # Try adding
    print("Attempting to add event...")
    res = gs.add_event(ev)
    print(f"Result: {res}")
    
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"CRITICAL ERROR: {e}")
