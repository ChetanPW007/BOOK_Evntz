import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.google_sheets import gs
from backend.config import SHEET_BOOKINGS

def backfill_bookings():
    print("🚀 Starting backfill of Auditorium field in bookings...")
    
    try:
        # 1. Fetch all events to create a mapping of EventID -> Auditorium
        events = gs.get_events()
        event_map = {}
        for e in events:
            eid = str(e.get("ID", "")).strip()
            # If multiple auditoriums, we pick the first one as default for legacy bookings
            # unless we can find a better way.
            audi = str(e.get("Auditorium", "")).split(",")[0].strip()
            event_map[eid] = audi
            
        print(f"✅ Loaded {len(event_map)} events for mapping.")

        # 2. Fetch all bookings
        bookings = gs.get_bookings()
        ws = gs._worksheet(SHEET_BOOKINGS)
        headers = gs._headers(ws)
        
        # Check if Auditorium header exists, if not add it
        if "Auditorium" not in headers:
            print("➕ Adding 'Auditorium' header to Bookings sheet...")
            headers.append("Auditorium")
            ws.update("A1", [headers])

        # 3. Update each booking if missing Auditorium
        updated_count = 0
        for i, b in enumerate(bookings, start=2):
            if not b.get("Auditorium"):
                eid = str(b.get("EventID", "")).strip()
                if eid in event_map:
                    target_audi = event_map[eid]
                    b["Auditorium"] = target_audi
                    gs.write_row_by_index(SHEET_BOOKINGS, i, b)
                    updated_count += 1
                    if updated_count % 10 == 0:
                        print(f"⏳ Updated {updated_count} bookings...")

        print(f"✨ Backfill complete! Total bookings updated: {updated_count}")
        
    except Exception as e:
        print(f"❌ Error during backfill: {e}")

if __name__ == "__main__":
    backfill_bookings()
