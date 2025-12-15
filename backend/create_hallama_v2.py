import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000/api"
AUDI_NAME = "Hallama Auditorium"

def create_precise_layout():
    # Grid Dimensions
    ROWS = 30
    COLS = 60
    grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]

    def add_row_centered(r, count, center_col, type_code=1):
        if r >= ROWS: return
        start = center_col - (count // 2)
        for k in range(count):
            c = start + k
            if 0 <= c < COLS:
                grid[r][c] = type_code

    def add_block(row_counts, start_row, center_col):
        for i, count in enumerate(row_counts):
            add_row_centered(start_row + i, count, center_col)

    # 1. CENTER: [11, 13, 19, 19, 19, 19, 19, 19, 19] -> Sum: 157
    add_block([11, 13, 19, 19, 19, 19, 19, 19, 19], 2, 30)

    # 2. LEFT: [7, 7, 9, 7, 9, 6, 6, 3, 2] -> Sum: 56
    add_block([7, 7, 9, 7, 9, 6, 6, 3, 2], 2, 10)

    # 3. RIGHT: [3, 6, 6, 9, 7, 9, 7, 7] -> Sum: 54
    add_block([3, 6, 6, 9, 7, 9, 7, 7], 2, 50)

    # 4. BACK LEFT: [7, 7, 7, 7, 5] -> Sum: 33
    add_block([7, 7, 7, 7, 5], 14, 12)

    # 5. BACK RIGHT: [7, 7, 7, 7, 7, 5] -> Sum: 40
    add_block([7, 7, 7, 7, 7, 5], 14, 48)
    
    # Total Expected: 157 + 56 + 54 + 33 + 40 = 340
    cap = sum(row.count(1) for row in grid)
    print(f"CALCULATED CAPACITY: {cap}")

    if cap < 100:
        print("ERROR: Capacity too low, logic incorrect?")

    payload = {
        "Name": AUDI_NAME,
        "Capacity": cap,
        "Description": "Exact layout from user notes",
        "Status": "Active",
        "SeatLayout": json.dumps({"rows": ROWS, "cols": COLS, "grid": grid})
    }

    print(f"Sending payload for {AUDI_NAME}...")
    
    # Try Update first
    res = requests.put(f"{BASE_URL}/auditoriums/update/{AUDI_NAME}", json=payload)
    print(f"UPDATE status: {res.status_code}")
    
    if res.status_code == 200:
        print("✅ SUCCESS: Updated existing auditorium.")
    elif res.status_code == 404:
        print("Not found, attempting create...")
        res = requests.post(f"{BASE_URL}/auditoriums/add", json=payload)
        print(f"CREATE status: {res.status_code}")
        if res.status_code == 200:
             print("✅ SUCCESS: Created new auditorium.")
        else:
             print(f"❌ CREATE FAIL: {res.text}")
    else:
        print(f"❌ UPDATE FAIL: {res.text}")

if __name__ == "__main__":
    create_precise_layout()
