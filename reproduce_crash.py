
import sys
import os
import json
import base64

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.google_sheets import gs

# Create a fake large Base64 image (approx 100KB)
# "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" is a 1x1 GIF
base64_img = "data:image/png;base64," + ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" * 1000)

ev = {
    "ID": "CRASH_TEST_1",
    "Name": "Crash Test Event",
    "Auditorium": "Main Auditorium",
    "Featured": "true",
    "Speakers": json.dumps([{"name": "Dr. Crash", "image": base64_img}]),
    "Coordinators": json.dumps([{"name": "Prof. Bug", "image": base64_img}]),
    "SeatLayout": "{}",
    "Poster": ""
}

print("Attempting to add event with Large Base64...")
try:
    # We are simulating what happens inside 'add_event' route logic partially
    # BUT 'add_event' route handles the image saving, NOT 'gs'.
    # So if I run 'gs.add_event' directly with base64, it WILL crash if 'gs' doesn't handle it.
    # The ROUTE is supposed to strip it. 
    # If the Route fails to strip it, then it hits GS.
    
    # So let's test if GS crashes on large payload
    res = gs.add_event(ev)
    print(f"Result: {res}")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"CRITICAL ERROR: {e}")
