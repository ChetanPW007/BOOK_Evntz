import requests
import json

try:
    r_audi = requests.get("http://127.0.0.1:5000/api/auditoriums/")
    auditoriums = r_audi.json().get('data', [])
    
    r_events = requests.get("http://127.0.0.1:5000/api/events/")
    events = r_events.json().get('events', [])

    print(f"Loaded {len(auditoriums)} auditoriums and {len(events)} events.")

    for audi in auditoriums:
        name = audi.get('Name')
        print(f"\nChecking Auditorium: '{name}'")
        
        matches = []
        for ev in events:
            # Check exact match
            match = False
            ev_audi = ev.get('Auditorium', '')
            if ev_audi == name:
                match = True
            elif ev_audi.strip().lower() == name.strip().lower():
                print(f"  [WARN] Loose match found! Event Audi: '{ev_audi}' vs Audi Name: '{name}'")
                match = True
            
            if match:
                matches.append(ev)
                print(f"  -> Found Event: '{ev.get('Name')}' Date: {ev.get('Date')} Match: Exact={ev_audi==name}")

        if not matches:
             print("  -> No matching events found.")

except Exception as e:
    print(e)
