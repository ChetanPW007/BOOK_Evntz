import requests
import json

try:
    r = requests.get("http://127.0.0.1:5000/api/auditoriums/")
    auditoriums = r.json().get('data', [])
    
    print("AUDITORIUM VISIBILITY CHECK (Should show all ACTIVE):")
    for audi in auditoriums:
        name = audi.get('Name')
        status = audi.get('Status')
        
        # Simulating frontend logic: Status == Active
        is_visible = str(status).lower() == 'active'
        visibility_text = "VISIBLE" if is_visible else "HIDDEN (Inactive)"
        
        print(f" - {name} [Status: {status}] -> {visibility_text}")

except Exception as e:
    print(e)
