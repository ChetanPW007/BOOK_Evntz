"""
One-time script to rename auditoriums in Google Sheets.
Renames:
  - "MAIN" -> "CSE Seminar Hall"
  - "Main Auditorium" -> "Civil Hall"
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import gspread
from google.oauth2.service_account import Credentials
from backend.config import get_google_credentials, SPREADSHEET_ID, SHEET_AUDITORIUMS, SHEET_EVENTS

SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]

RENAMES = {
    "MAIN": "CSE Seminar Hall",
    "Main Auditorium": "Civil Hall",
}

def main():
    creds_dict = get_google_credentials()
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(SPREADSHEET_ID)

    # ── 1. Rename in Auditoriums sheet ──────────────────────────────────────
    try:
        ws = sheet.worksheet(SHEET_AUDITORIUMS)
        records = ws.get_all_records()
        headers = ws.row_values(1)
        name_col = headers.index("Name") + 1  # 1-indexed

        for i, row in enumerate(records, start=2):  # data starts at row 2
            old_name = str(row.get("Name", "")).strip()
            if old_name in RENAMES:
                new_name = RENAMES[old_name]
                ws.update_cell(i, name_col, new_name)
                print(f"✅ Auditoriums sheet: '{old_name}' → '{new_name}' (row {i})")
    except Exception as e:
        print(f"❌ Error updating Auditoriums sheet: {e}")

    # ── 2. Rename in Events sheet (Auditorium column) ───────────────────────
    try:
        ws_events = sheet.worksheet("Events")
        records_ev = ws_events.get_all_records()
        headers_ev = ws_events.row_values(1)

        if "Auditorium" in headers_ev:
            audi_col = headers_ev.index("Auditorium") + 1

            for i, row in enumerate(records_ev, start=2):
                old_val = str(row.get("Auditorium", "")).strip()
                if old_val in RENAMES:
                    new_val = RENAMES[old_val]
                    ws_events.update_cell(i, audi_col, new_val)
                    print(f"✅ Events sheet row {i}: Auditorium '{old_val}' → '{new_val}'")
        else:
            print("ℹ️  No 'Auditorium' column found in Events sheet — skipping.")
    except Exception as e:
        print(f"❌ Error updating Events sheet: {e}")

    print("\n🎉 Done!")

if __name__ == "__main__":
    main()
