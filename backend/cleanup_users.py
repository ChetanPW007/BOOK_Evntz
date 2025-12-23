# backend/cleanup_users.py
import sys
import os

# Add the project root to sys.path to allow importing from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.google_sheets import gs
from backend.config import SHEET_USERS

def cleanup():
    print("🚀 Starting User Sheet Cleanup...")
    
    # 1. Fetch all records
    ws = gs._worksheet(SHEET_USERS)
    all_data = ws.get_all_records()
    headers = ws.row_values(1)
    
    print(f"Current Headers: {headers}")
    
    # Identify target headers and source headers
    mapping = {
        "name": "Name",
        "email": "Email",
        "usn": "USN",
        "branch": "Branch",
        "sem": "Sem"
    }
    
    # 2. Process rows
    cleaned_rows = []
    for row in all_data:
        # Move data from lowercase to capitalized if capitalized is empty
        for src, target in mapping.items():
            if src in row and row[src] and not row.get(target):
                row[target] = row[src]
        
        # Build the row for update (respecting original capitalized order)
        # We only want columns A-J (Name, Email, USN, College, Branch, Sem, Phone, Password, Role, Suspended)
        primary_headers = ["Name", "Email", "USN", "College", "Branch", "Sem", "Phone", "Password", "Role", "Suspended"]
        
        new_row = []
        for h in primary_headers:
            new_row.append(str(row.get(h, "")))
        cleaned_rows.append(new_row)

    # 3. Update the whole sheet
    # First, truncate/overwrite the top part with primary headers
    ws.update("A1", [primary_headers])
    
    # Update all rows
    if cleaned_rows:
        range_end = f"J{len(cleaned_rows) + 1}"
        ws.update(f"A2:{range_end}", cleaned_rows)
        
    # 4. Remove leftover columns if they exist beyond J
    # Google Sheets columns: J is 10th. If headers had more, they are still there.
    # Actually ws.update just updates cells. If columns K+ had data, they remain.
    # Let's explicitly clear them or delete them.
    if len(headers) > 10:
        print(f"Cleaning up {len(headers) - 10} extra columns...")
        # Delete columns from 11 onwards
        # ws.delete_columns is not in gspread by default in some versions or needs index
        # Better: resize the sheet or just clear the range
        last_col_letter = ""
        n = len(headers)
        while n > 0:
            n, rem = divmod(n-1, 26)
            last_col_letter = chr(65+rem) + last_col_letter
        
        ws.batch_clear([f"K1:{last_col_letter}{len(all_data) + 1}"])
        print("✅ Redundant columns cleared.")

    print("✨ Cleanup Complete!")

if __name__ == "__main__":
    cleanup()
