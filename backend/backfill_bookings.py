import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.google_sheets import gs
from backend.config import SHEET_BOOKINGS, SHEET_ATTENDANCE

def backfill_bookings():
    print("🚀 Starting backfill of Auditorium, EventName, and Email fields...")
    
    try:
        # 1. Fetch all events and users to create mappings
        events = gs.get_events()
        users = gs.get_users()
        
        event_map = {}
        for e in events:
            eid = str(e.get("ID", "")).strip()
            audi = str(e.get("Auditorium", "")).split(",")[0].strip()
            name = str(e.get("Name", "Unknown")).strip()
            event_map[eid] = {"auditorium": audi, "name": name}
        
        # User lookup by USN (case-insensitive)
        users_map = {str(u.get("USN", "")).strip().lower(): u for u in users}
            
        print(f"✅ Loaded {len(event_map)} events and {len(users_map)} users for mapping.")

        # ---- BACKFILL BOOKINGS SHEET ----
        print("\n📋 Backfilling Bookings sheet...")
        bookings = gs.get_bookings()
        ws = gs._worksheet(SHEET_BOOKINGS)
        headers = gs._headers(ws)
        
        headers_changed = False
        for col_name in ["Auditorium", "EventName", "Email"]:
            if col_name not in headers:
                print(f"➕ Adding '{col_name}' header to Bookings sheet...")
                headers.append(col_name)
                headers_changed = True
        
        if headers_changed:
            ws.update("A1", [headers])

        updated_count = 0
        for i, b in enumerate(bookings, start=2):
            needs_update = False
            eid = str(b.get("EventID", "")).strip()
            event_info = event_map.get(eid, {})
            usn_key = str(b.get("USN", "")).strip().lower()
            user_info = users_map.get(usn_key, {})
            
            if not b.get("Auditorium") and event_info.get("auditorium"):
                b["Auditorium"] = event_info["auditorium"]
                needs_update = True
            
            if not b.get("EventName") and event_info.get("name"):
                b["EventName"] = event_info["name"]
                needs_update = True
            
            if not b.get("Email") and user_info.get("Email"):
                b["Email"] = user_info["Email"]
                needs_update = True
            
            if needs_update:
                gs.write_row_by_index(SHEET_BOOKINGS, i, b)
                updated_count += 1
                if updated_count % 10 == 0:
                    print(f"⏳ Updated {updated_count} bookings...")

        print(f"✨ Bookings backfill complete! Total updated: {updated_count}")

        # ---- BACKFILL ATTENDANCE SHEET ----
        print("\n📋 Backfilling Attendance sheet...")
        attendance = gs.get_attendance()
        ws_att = gs._worksheet(SHEET_ATTENDANCE)
        att_headers = gs._headers(ws_att)
        
        att_headers_changed = False
        for col_name in ["EventName", "Email"]:
            if col_name not in att_headers:
                print(f"➕ Adding '{col_name}' header to Attendance sheet...")
                att_headers.append(col_name)
                att_headers_changed = True
        
        if att_headers_changed:
            ws_att.update("A1", [att_headers])

        att_updated = 0
        for i, a in enumerate(attendance, start=2):
            needs_update = False
            eid = str(a.get("EventID", "")).strip()
            event_info = event_map.get(eid, {})
            usn_key = str(a.get("USN", "")).strip().lower()
            user_info = users_map.get(usn_key, {})
            
            if not a.get("EventName") and event_info.get("name"):
                a["EventName"] = event_info["name"]
                needs_update = True
            
            if not a.get("Email") and user_info.get("Email"):
                a["Email"] = user_info["Email"]
                needs_update = True
            
            if needs_update:
                gs.write_row_by_index(SHEET_ATTENDANCE, i, a)
                att_updated += 1
                if att_updated % 10 == 0:
                    print(f"⏳ Updated {att_updated} attendance records...")

        print(f"✨ Attendance backfill complete! Total updated: {att_updated}")
        
    except Exception as e:
        print(f"❌ Error during backfill: {e}")

if __name__ == "__main__":
    backfill_bookings()

