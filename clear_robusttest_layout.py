"""
Script to remove SeatLayout from RobustTest event
This will make the event use the Hallama Auditorium's layout instead
"""
import requests
import json

# API endpoint
API_URL = "http://127.0.0.1:5000/api/events/update/EV13"

# Update payload - set SeatLayout to empty string
payload = {
    "SeatLayout": ""
}

# Make the request
response = requests.put(API_URL, json=payload)

# Print result
print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 200:
    print("\n✅ SUCCESS! SeatLayout removed from RobustTest event.")
    print("📍 The event will now use Hallama Auditorium's configured layout.")
    print("\n🔄 Please refresh the booking page to see the change.")
else:
    print("\n❌ Failed to update event. Check the error above.")
