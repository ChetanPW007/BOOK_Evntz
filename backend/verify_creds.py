
import os
import sys
from google.oauth2.service_account import Credentials

CRED_FILE = "backend/config/credentials.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def check_creds():
    print(f"Checking {CRED_FILE}...")
    if not os.path.exists(CRED_FILE):
        print(f"ERROR: File not found at {os.path.abspath(CRED_FILE)}")
        return

    try:
        creds = Credentials.from_service_account_file(CRED_FILE, scopes=SCOPES)
        print("Credentials object created successfully.")
        
        # Try to sign a byte string to verify the key
        # This doesn't make a network request but checks if the key is structurally valid.
        if creds.signer:
             print("Signer is present.")
             # The error 'Invalid JWT Signature' often happens during the token request exchange.
             # We can try to force a refresh to triggering the error.
        
        from google.auth.transport.requests import Request
        print("Attempting to refresh token...")
        creds.refresh(Request())
        print("SUCCESS: Token refreshed successfully. Credentials are valid.")

    except Exception as e:
        print(f"FAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_creds()
