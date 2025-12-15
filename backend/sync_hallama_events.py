
import sys
import os
import json
from backend.services.google_sheets import GoogleSheets, SHEET_EVENTS, SHEET_AUDITORIUMS

def sync_layouts():
    print("Connecting to Google Sheets...")
    gs = GoogleSheets()
    
    # 1. Get Master Layout for Hallama
    auditoriums = gs.get_auditoriums_full()
    hallama = next((a for a in auditoriums if a.get("Name") == "Hallama Auditorium"), None)
    
    if not hallama:
        print("ERROR: Hallama Auditorium not found in master sheet!")
        return
        
    master_layout = hallama.get("SeatLayout", "")
    if not master_layout:
        print("ERROR: Hallama Auditorium has no SeatLayout!")
        return
        
    print(f"Found Master Layout. Length: {len(master_layout)} chars")
    
    # 2. Get Events
    events = gs.get_events()
    updates_count = 0
    
    print(f"Scanning {len(events)} events...")
    
    for ev in events:
        if ev.get("Auditorium") == "Hallama Auditorium":
            # Check if layout is missing or different (simplified check)
            current_layout = ev.get("SeatLayout", "")
            if not current_layout or len(current_layout) < 100:
                print(f"Updating Event '{ev.get('Name')}' (ID: {ev.get('ID')})...")
                
                # Update specific event
                # We use update_event but we need to ensure we pass the layout
                ok = gs.update_event(ev.get("ID"), {"SeatLayout": master_layout})
                if ok:
                    print("  -> Success")
                    updates_count += 1
                else:
                    print("  -> Failed to update")
            else:
                print(f"Event '{ev.get('Name')}' already has a layout. Skipping.")

    print(f"Done. Updated {updates_count} events.")

if __name__ == "__main__":
    sync_layouts()
