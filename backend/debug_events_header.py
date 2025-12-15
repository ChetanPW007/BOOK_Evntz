
from backend.services.google_sheets import GoogleSheets, SHEET_EVENTS

def check_events_structure():
    gs = GoogleSheets()
    ws = gs._worksheet(SHEET_EVENTS)
    headers = gs._headers(ws)
    print(f"Current Headers in '{SHEET_EVENTS}': {headers}")
    
    if "SeatLayout" not in headers:
        print("CRITICAL: 'SeatLayout' header is MISSING!")
    else:
        print("OK: 'SeatLayout' header exists.")
        
    # Check data of first few events
    events = gs.get_events()
    for i, ev in enumerate(events[:3]):
        layout = ev.get("SeatLayout", "")
        print(f"Event {i+1} ({ev.get('Name')}): SeatLayout length = {len(str(layout))}")

if __name__ == "__main__":
    check_events_structure()
