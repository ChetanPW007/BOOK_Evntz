import gspread
from google.oauth2.service_account import Credentials
from backend.config import SERVICE_ACCOUNT_FILE, SPREADSHEET_ID, SHEET_AUDITORIUMS

SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]

def debug_sheet():
    print(f"Connecting to Spreadsheet ID: {SPREADSHEET_ID}")
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(SPREADSHEET_ID)
    
    print("Worksheets found:")
    for ws in sheet.worksheets():
        print(f" - {ws.title}")

    try:
        ws = sheet.worksheet(SHEET_AUDITORIUMS)
        print(f"\nScanning '{SHEET_AUDITORIUMS}'...")
        vals = ws.get_all_values()
        print(f"Total Rows: {len(vals)}")
        for i, row in enumerate(vals[:5]):
            print(f"Row {i}: {row}")
            
        recs = ws.get_all_records()
        print(f"\nget_all_records(): {recs}")
        
    except Exception as e:
        print(f"\nERROR accessing '{SHEET_AUDITORIUMS}': {e}")

if __name__ == "__main__":
    debug_sheet()
