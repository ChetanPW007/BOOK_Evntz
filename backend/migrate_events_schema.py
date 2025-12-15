
from backend.services.google_sheets import GoogleSheets, SHEET_EVENTS

def migrate_schema():
    gs = GoogleSheets()
    ws = gs._worksheet(SHEET_EVENTS)
    headers = gs._headers(ws)
    print(f"Current Headers: {headers}")
    
    new_cols = ["Schedules", "Duration", "PublishAt"]
    added = []
    
    current_len = len(headers)
    
    for col in new_cols:
        if col not in headers:
            current_len += 1
            ws.update_cell(1, current_len, col)
            added.append(col)
            
    if added:
        print(f"Successfully added columns: {added}")
    else:
        print("All columns already exist.")

if __name__ == "__main__":
    migrate_schema()
