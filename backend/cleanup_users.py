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
        "sem": "Sem",
        "phone": "Phone",
        "college": "College",
        "password": "Password",
        "role": "Role",
        "suspended": "Suspended"
    }
    
    # 2. Process rows
    cleaned_rows = []
    primary_headers = ["Name", "Email", "USN", "College", "Branch", "Sem", "Phone", "Password", "Role", "Suspended"]

    for row in all_data:
        processed_row = {h: row.get(h, "") for h in primary_headers}
        
        # Move data from any case variant to capitalized
        for k, v in row.items():
            if not v: continue
            target = mapping.get(k.lower())
            if target and not processed_row.get(target):
                processed_row[target] = v
        
        new_row_list = [str(processed_row.get(h, "")) for h in primary_headers]
        cleaned_rows.append(new_row_list)

    # 3. Update the whole sheet
    # Set headers exactly
    ws.update("A1", [primary_headers])
    
    # Update all rows
    if cleaned_rows:
        range_end = f"J{len(cleaned_rows) + 1}"
        ws.update(f"A2:{range_end}", cleaned_rows)
        
    # 4. Remove leftover columns if they exist beyond J
    if len(headers) > 10:
        print(f"Cleaning up {len(headers) - 10} extra columns...")
        last_col_letter = ""
        n = len(headers)
        while n > 0:
            n, rem = divmod(n-1, 26)
            last_col_letter = chr(65+rem) + last_col_letter
        
        # Clear including header row
        ws.batch_clear([f"K1:{last_col_letter}{len(all_data) + 10}"])
        print("✅ Redundant columns cleared.")

    print("✨ Cleanup Complete!")

if __name__ == "__main__":
    cleanup()
