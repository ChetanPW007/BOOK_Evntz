import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000/api"

def log(msg):
    print(f"[TEST] {msg}")

def test_auditorium_crud():
    log("Testing Auditorium CRUD...")
    
    # 1. Add Auditorium
    unique_name = f"Test Hall {int(time.time())}"
    payload = {
        "Name": unique_name,
        "Capacity": 100,
        "Description": "Automated Test Hall",
        "Status": "Active",
        "SeatLayout": json.dumps({"rows": 5, "cols": 5, "grid": []})
    }
    
    res = requests.post(f"{BASE_URL}/auditoriums/add", json=payload)
    if res.status_code == 200:
        log(f"✅ Created: {res.json()['message']}")
    else:
        log(f"❌ Failed to create: {res.text}")
        return

    # 2. List Auditoriums
    res = requests.get(f"{BASE_URL}/auditoriums/")
    if res.status_code == 200:
        data = res.json().get('data', [])
        found = any(x for x in data if x.get('Name') == unique_name)
        if found:
            log(f"✅ Found Created Auditorium in List")
        else:
            log(f"❌ Created Auditorium NOT in List")
    else:
        log(f"❌ List Failed: {res.text}")

    # 3. Update Auditorium
    update_payload = {"Description": "Updated Desc", "Capacity": 120}
    res = requests.put(f"{BASE_URL}/auditoriums/update/{unique_name}", json=update_payload)
    if res.status_code == 200:
        log(f"✅ Updated: {res.json()['message']}")
    else:
        log(f"❌ Update Failed: {res.text}")

if __name__ == "__main__":
    try:
        test_auditorium_crud()
    except Exception as e:
        log(f"Failed with exception: {e}")
