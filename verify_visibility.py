import requests
import json

try:
    r = requests.get("http://127.0.0.1:5000/api/auditoriums/")
    auditoriums = r.json().get('data', [])
    r_events = requests.get("http://127.0.0.1:5000/api/events/")
    events = r_events.json().get('events', [])
    
    print("Auditoriums matching with events:")
    for audi in auditoriums:
        audi_name = audi.get('Name').strip().lower()
        has_event = False
        for ev in events:
            ev_audi = ev.get('Auditorium', '').strip().lower()
            if ev_audi == audi_name:
                has_event = True
                break
        
        status = "VISIBLE" if has_event else "HIDDEN (No Events)"
        print(f" - {audi.get('Name')}: {status}")

except Exception as e:
    print(e)
