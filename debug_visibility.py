import requests
import json
from datetime import datetime

# Helper to simulate JS date parsing roughly (or at least check format)
def check_date(date_str, time_str):
    try:
        full_str = f"{date_str} {time_str or '23:59'}"
        # JS new Date("YYYY-MM-DD HH:MM") works.
        # Check if date_str is YYYY-MM-DD
        dt = datetime.strptime(full_str, "%Y-%m-%d %H:%M")
        return dt > datetime.now(), dt
    except ValueError:
        return False, "ParseError"

try:
    print("--- FETCHING DATA ---")
    r_audi = requests.get("http://127.0.0.1:5000/api/auditoriums/")
    auditoriums = r_audi.json().get('data', [])
    r_events = requests.get("http://127.0.0.1:5000/api/events/")
    events = r_events.json().get('events', [])
    
    print(f"Auditoriums: {len(auditoriums)}")
    print(f"Events: {len(events)}")
    
    print("\n--- CHECKING MATCHES ---")
    for audi in auditoriums:
        audi_name = audi.get('Name', '').strip()
        audi_status = audi.get('Status', '')
        print(f"\nAUDITORIUM: '{audi_name}' (Status: {audi_status})")
        
        if str(audi_status).lower() != 'active':
            print("  -> SKIPPING: Not Active")
            continue
            
        has_future_visible_event = False
        
        for ev in events:
            ev_audi = ev.get('Auditorium', '').strip()
            # Loose match check
            if ev_audi.lower() != audi_name.lower():
                continue
                
            ev_name = ev.get('Name')
            ev_date = ev.get('Date')
            ev_time = ev.get('Time')
            ev_visibility = ev.get('Visibility')
            
            print(f"  MATCHING EVENT: '{ev_name}'")
            print(f"    - Date: {ev_date}, Time: {ev_time}")
            print(f"    - Visibility: {ev_visibility}")
            
            # Visibility Check
            is_visible = not ev_visibility or str(ev_visibility).lower() in ['visible', 'true']
            if not is_visible:
                print("    -> Fail: Visibility check")
            
            # Future Check
            is_future, dt_obj = check_date(ev_date, ev_time)
            print(f"    - Parsed Date: {dt_obj} (Is Future? {is_future})")
            
            if is_visible and is_future:
                has_future_visible_event = True
                print("    -> SUCCESS: This event makes the auditorium visible.")
        
        if has_future_visible_event:
            print("  => RESULT: VISIBLE")
        else:
            print("  => RESULT: HIDDEN")

except Exception as e:
    print(f"ERROR: {e}")
