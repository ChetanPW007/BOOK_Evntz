import os
import json
from dotenv import load_dotenv

load_dotenv() # Load .env file

# Path to your Google Service Account JSON file (relative to project root)
# For local development
SERVICE_ACCOUNT_FILE = "backend/config/credentials.json"

# For production (Render.com) - credentials from environment variable
# Set GOOGLE_SHEETS_CREDS environment variable with the JSON content
GOOGLE_SHEETS_CREDS = os.getenv("GOOGLE_SHEETS_CREDS")

# Email Credentials
EMAIL_SENDER = os.getenv("EMAIL_SENDER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# Helper function to get credentials
def get_google_credentials():
    """
    Returns Google credentials either from file (local) or environment variable (production)
    """
    if GOOGLE_SHEETS_CREDS:
        # Production: Use environment variable
        try:
            return json.loads(GOOGLE_SHEETS_CREDS)
        except json.JSONDecodeError:
            print("ERROR: GOOGLE_SHEETS_CREDS environment variable contains invalid JSON")
            return None
    elif os.path.exists(SERVICE_ACCOUNT_FILE):
        # Development: Use file
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            return json.load(f)
    else:
        print(f"ERROR: Neither GOOGLE_SHEETS_CREDS env var nor {SERVICE_ACCOUNT_FILE} found")
        return None

# Spreadsheet ID (replace with your actual spreadsheet id)
SPREADSHEET_ID = "1dvo_lNlxHBRNa3jkwBzVqEjNqcCKFuwFchbjzBvPdGc"

# Sheet / Tab names (must match exactly the sheet tab names)
SHEET_USERS = "Users"
SHEET_EVENTS = "Events"
SHEET_BOOKINGS = "Bookings"
SHEET_SPEAKERS = "Speakers"
SHEET_COORDINATORS = "Coordinators"
SHEET_AUDITORIUMS = "Auditoriums"
SHEET_ATTENDANCE = "Attendance"
