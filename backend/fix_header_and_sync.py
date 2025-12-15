
from backend.services.google_sheets import GoogleSheets, SHEET_EVENTS

def fix_and_sync():
    gs = GoogleSheets()
    ws = gs._worksheet(SHEET_EVENTS)
    headers = gs._headers(ws)
    print(f"Old Headers: {headers}")
    
    if "SeatLayout" not in headers:
        print("Adding 'SeatLayout' header...")
        # Update cell in first row, next column
        col_idx = len(headers) + 1
        ws.update_cell(1, col_idx, "SeatLayout")
        print("Header added.")
    else:
        print("Header already exists.")
        
    # Now run the sync
    print("Re-syncing Hallama events...")
    import backend.sync_hallama_events
    backend.sync_hallama_events.sync_layouts()

if __name__ == "__main__":
    fix_and_sync()
