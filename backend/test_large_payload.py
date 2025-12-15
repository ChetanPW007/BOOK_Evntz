import requests
import base64
import os

# Create a large dummy base64 string (approx 60KB)
# 50k chars is the limit for a cell in Google Sheets usually?
dummy_data = "A" * 60000 

payload = {
    "Name": "Large Payload Test",
    "Auditorium": "Test Hall",
    "Date": "2025-01-01",
    "Time": "12:00",
    "Poster": f"data:image/jpeg;base64,{dummy_data}",
    "About": "Testing large payload"
}

print("Sending request to add event with large poster...")
try:
    res = requests.post("http://localhost:5000/api/events/add", json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Request failed: {e}")
