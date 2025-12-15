import requests
import json

BASE_URL = "http://127.0.0.1:5000/api"
AUDI_NAME = "Hallama Auditorium"

def create_precise_layout():
    # Grid Dimensions (Generous size to fit all)
    ROWS = 30
    COLS = 60
    grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]

    # Helper: Add seats centered at 'center_col' for a specific 'row_idx'
    def add_row_centered(r, count, center_col, type_code=1):
        if r >= ROWS: return
        start = center_col - (count // 2)
        for k in range(count):
            c = start + k
            if 0 <= c < COLS:
                grid[r][c] = type_code

    # Helper: Add block of rows
    # row_counts: list of integers (seats per row)
    # start_row: grid row index to start placing
    # center_col: rough center column for this block
    def add_block(row_counts, start_row, center_col):
        for i, count in enumerate(row_counts):
            add_row_centered(start_row + i, count, center_col)

    # --- 1. CENTER BLOCK (Front) ---
    # Row A to I (9 rows)
    # 11, 13, 19...
    center_counts = [11, 13, 19, 19, 19, 19, 19, 19, 19]
    # Place at Grid Row 2 (leaving 0,1 for screen/stage visual)
    add_block(center_counts, 2, 30)

    # --- 2. LEFT SIDE BLOCK ---
    # Row A to I (9 rows)
    # 7, 7, 9...
    # Place at Grid Row 2, centered around col 10
    left_counts = [7, 7, 9, 7, 9, 6, 6, 3, 2]
    add_block(left_counts, 2, 10)

    # --- 3. RIGHT SIDE BLOCK ---
    # Row A to H (8 rows)
    # 3, 6, 6...
    # Place at Grid Row 2, centered around col 50
    # Note: Row A has 3 seats.
    right_counts = [3, 6, 6, 9, 7, 9, 7, 7]
    add_block(right_counts, 2, 50)

    # --- Aisle Gap ---
    # Front blocks end at Row 2+9=11. Let's leave Row 11, 12 blank.
    # Start Back blocks at Row 14.

    # --- 4. BACK LEFT ---
    # Row A to E (5 rows)
    # 7, 7, 7, 7, 5
    # Center around col 12 (shifted slightly in usually?) or aligned with left block (10).
    # Let's align with Left Block (10) + a bit inward maybe? Let's stick to 12.
    back_left_counts = [7, 7, 7, 7, 5]
    add_block(back_left_counts, 14, 12)

    # --- 5. BACK RIGHT ---
    # Row A to F (6 rows)
    # 7, 7, 7, 7, 7, 5
    # Center around col 48.
    back_right_counts = [7, 7, 7, 7, 7, 5]
    add_block(back_right_counts, 14, 48)
    
    # Calculate Capacity
    cap = sum(row.count(1) for row in grid)
    print(f" Calculated Capacity: {cap}")

    # Payload
    payload = {
        "Name": AUDI_NAME,
        "Capacity": cap,
        "Description": "Exact layout based on user specification",
        "Status": "Active",
        "SeatLayout": json.dumps({"rows": ROWS, "cols": COLS, "grid": grid})
    }

    # Try Update first (overwrite if exists)
    print(f"Attempting to update '{AUDI_NAME}'...")
    res = requests.put(f"{BASE_URL}/auditoriums/update/{AUDI_NAME}", json=payload)
    
    if res.status_code == 200:
        print("✅ Successfully Updated Layout")
    elif res.status_code == 404:
        # Not found, create it
        print("Auditorium not found, creating new...")
        res = requests.post(f"{BASE_URL}/auditoriums/add", json=payload)
        if res.status_code == 200:
            print("✅ Successfully Created Layout")
        else:
            print(f"❌ Creation Failed: {res.text}")
    else:
        print(f"❌ Update Failed: {res.text}")

if __name__ == "__main__":
    create_precise_layout()
