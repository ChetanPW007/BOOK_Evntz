# backend/services/google_sheets.py
import gspread
from google.oauth2.service_account import Credentials
from backend.config import (
    get_google_credentials, SPREADSHEET_ID,
    SHEET_USERS, SHEET_EVENTS, SHEET_BOOKINGS,
    SHEET_SPEAKERS, SHEET_COORDINATORS, SHEET_ATTENDANCE,
    SHEET_AUDITORIUMS
)
from datetime import datetime
import uuid

SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]

class GoogleSheets:
    def __init__(self):
        # Use the centralized credentials helper
        creds_dict = get_google_credentials()
        
        if not creds_dict:
            raise Exception("Failed to load Google Sheets credentials. Check your config.")
        
        try:
            creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
            print("✅ Google Sheets authenticated successfully")
        except Exception as e:
            print(f"❌ Failed to authenticate with Google Sheets: {e}")
            raise e
            
        client = gspread.authorize(creds)
        self.sheet = client.open_by_key(SPREADSHEET_ID)

    # ---------- Generic helpers ----------
    def _worksheet(self, name):
        try:
            return self.sheet.worksheet(name)
        except gspread.exceptions.WorksheetNotFound:
            # Auto-create if missing (Generic fallback)
            # Default 1000 rows, 26 cols
            return self.sheet.add_worksheet(title=name, rows=1000, cols=26)

    def _headers(self, worksheet):
        return worksheet.row_values(1)

    def read_range(self, sheet_name):
        ws = self._worksheet(sheet_name)
        return ws.get_all_records()

    def append_row(self, sheet_name, row_dict):
        ws = self._worksheet(sheet_name)
        headers = self._headers(ws)
        
        # --- CASE-INSENSITIVE HEADER MAPPING ---
        header_map = {h.lower(): h for h in headers}
        
        # --- DYNAMIC HEADER EXPANSION ---
        try:
            missing_headers = []
            for k in row_dict.keys():
                if k.lower() not in header_map:
                    missing_headers.append(k)
                else:
                    # Update row_dict to match existing header casing if it differs
                    actual_h = header_map[k.lower()]
                    if actual_h != k and actual_h in headers:
                        # Move data to the correctly cased key
                        row_dict[actual_h] = row_dict.get(actual_h) or row_dict.get(k)

            if missing_headers:
                print(f"DEBUG: Found new columns for {sheet_name}: {missing_headers}")
                headers.extend(missing_headers)
                ws.update("A1", [headers]) 
                # Refresh header map
                header_map = {h.lower(): h for h in headers}
        except Exception as e:
            print(f"Header Expansion Failed (Non-critical): {e}")
            pass 
        
        print(f"DEBUG: append_row sheet={sheet_name} headers={headers}")
        
        # create row in same header order
        row = []
        for h in headers:
            # Try exact match first, then case-insensitive
            val = row_dict.get(h)
            if val is None:
                # Fallback to case-insensitive match from the input
                for k, v in row_dict.items():
                    if k.lower() == h.lower():
                        val = v
                        break
            
            val_str = str(val) if val is not None else ""
            
            # SAFETY TRUNCATE
            if len(val_str) > 40000:
                print(f"WARNING: Truncating column '{h}' (len {len(val_str)}) to avoid API crash.")
                val_str = val_str[:40000] + "...(TRUNCATED)"
            row.append(val_str)
            
        ws.append_row(row)
        return True

    def write_row_by_index(self, sheet_name, row_index, row_dict):
        ws = self._worksheet(sheet_name)
        headers = self._headers(ws)
        
        # --- CASE-INSENSITIVE HEADER MAPPING ---
        header_map = {h.lower(): h for h in headers}

        # --- DYNAMIC HEADER EXPANSION ---
        try:
            missing_headers = []
            for k in row_dict.keys():
                if k.lower() not in header_map:
                    missing_headers.append(k)
            
            if missing_headers:
                print(f"DEBUG: Found new columns for {sheet_name} (update): {missing_headers}")
                headers.extend(missing_headers)
                ws.update("A1", [headers]) 
                header_map = {h.lower(): h for h in headers}
        except Exception as e:
            print(f"Header Expansion Failed (Update) (Non-critical): {e}")
            pass

        # create row in same header order with safety truncate
        row = []
        for h in headers:
            # Try exact match first, then case-insensitive
            val = row_dict.get(h)
            if val is None:
                for k, v in row_dict.items():
                    if k.lower() == h.lower():
                        val = v
                        break
            
            val_str = str(val) if val is not None else ""
            if len(val_str) > 40000:
                 print(f"WARNING: Truncating column '{h}' to avoid API crash.")
                 val_str = val_str[:40000] + "...(TRUNCATED)"
            row.append(val_str)

        # compute last column letter
        last_col = len(headers)
        def col_letter(n):
            s = ""
            while n > 0:
                n, rem = divmod(n-1, 26)
                s = chr(65+rem) + s
            return s
        last_col_letter = col_letter(last_col)
        ws.update(f"A{row_index}:{last_col_letter}{row_index}", [row])
        return True

    def find_row_index(self, sheet_name, key_col_name, key_value):
        rows = self.read_range(sheet_name)
        for i, r in enumerate(rows, start=2):
            if str(r.get(key_col_name, "")).strip().lower() == str(key_value).strip().lower():
                return i, r
        return None, None

    def delete_rows_matching(self, sheet_name, key_col_name, key_value):
        ws = self._worksheet(sheet_name)
        rows = ws.get_all_records()
        # delete from bottom up so indices remain valid
        for i in range(len(rows), 0, -1):
            if str(rows[i-1].get(key_col_name, "")).strip() == str(key_value):
                ws.delete_rows(i+1)

    # ---------- Users ----------
    def get_users(self):
        try:
            return self.read_range(SHEET_USERS)
        except Exception:
            return []

    def add_user(self, user):
        return self.append_row(SHEET_USERS, user)

    def update_user(self, usn, updates):
        row_index, existing = self.find_row_index(SHEET_USERS, "USN", usn)
        if not row_index:
            return False
        for k, v in updates.items():
            existing[k] = v
        return self.write_row_by_index(SHEET_USERS, row_index, existing)

    def delete_user(self, usn):
        row_index, _ = self.find_row_index(SHEET_USERS, "USN", usn)
        if not row_index:
            return False
        ws = self._worksheet(SHEET_USERS)
        ws.delete_rows(row_index)
        return True

    # ---------- Events ----------
    def get_events(self):
        try:
            return self.read_range(SHEET_EVENTS)
        except Exception:
            return []

    def add_event(self, ev):
        # 1. Fetch existing events to determine next ID
        existing_events = self.get_events()
        
        if not ev.get("ID"):
            # Analyze existing IDs to find max number
            max_num = 0
            for e in existing_events:
                eid = str(e.get("ID", "")).upper()
                if eid.startswith("EV"):
                    try:
                        # Extract numeric part "EV01" -> 1
                        num_part = int(eid[2:])
                        if num_part > max_num:
                            max_num = num_part
                    except ValueError:
                        pass
            
            # Generate new ID
            next_num = max_num + 1
            ev["ID"] = f"EV{next_num:02d}"
        
        # 2. Check for Duplicates (Double Check)
        for e in existing_events:
            # Case-insensitive check for ID collision
            if str(e.get("ID", "")).strip().lower() == str(ev["ID"]).strip().lower():
                # We could raise an error here if we wanted strict unique ID enforcement
                # For now just proceed, assuming we want to overwrite or it's fine
                pass 

        print(f"Adding Event: {ev['ID']}") # Debug log
        
        # FAIL-SAFE SAVE ATTEMPT
        try:
            return self.append_row(SHEET_EVENTS, ev)
        except Exception as e:
            print(f"CRITICAL: Event Save Failed: {e}. Retrying with Clean Data...", flush=True)
            # STRATEGIC FALLBACK: Strip heavy fields that likely caused the crash (e.g. Layout too big, Image too big)
            # We preserve the ID and core info so the event is created.
            ev_clean = ev.copy()
            ev_clean["SeatLayout"] = ""
            ev_clean["Poster"] = ""
            ev_clean["Speakers"] = ""
            ev_clean["Coordinators"] = ""
            ev_clean["About"] += " [AUTO-RECOVERED: Some data omitted due to size error]"
            
            try:
                return self.append_row(SHEET_EVENTS, ev_clean)
            except Exception as e2:
                 print(f"FATAL: Recovery Save Failed too: {e2}", flush=True)
                 raise e # Bubble up to global handler now

    def update_event(self, event_id, updates):
        row_index, existing = self.find_row_index(SHEET_EVENTS, "ID", event_id)
        if not row_index:
            return False
        for k, v in updates.items():
            existing[k] = v
        return self.write_row_by_index(SHEET_EVENTS, row_index, existing)

    def delete_event(self, event_id):
        row_index, _ = self.find_row_index(SHEET_EVENTS, "ID", event_id)
        if not row_index:
            return False
        ws = self._worksheet(SHEET_EVENTS)
        ws.delete_rows(row_index)
        # cleanup related bookings and attendance
        self.delete_bookings_for_event(event_id)
        self.delete_attendance_for_event(event_id)
        return True

    def toggle_event_visibility(self, event_id, flag):
        return self.update_event(event_id, {"Visibility": flag})

    # ---------- Bookings ----------
    def get_bookings(self):
        try:
            return self.read_range(SHEET_BOOKINGS)
        except Exception:
            return []

    def add_booking(self, b):
        if not b.get("BookingID"):
            b["BookingID"] = str(uuid.uuid4())
        if not b.get("Timestamp"):
            b["Timestamp"] = datetime.utcnow().timestamp()
        return self.append_row(SHEET_BOOKINGS, b)

    def find_booking(self, booking_id):
        return self.find_row_index(SHEET_BOOKINGS, "BookingID", booking_id)

    def update_booking_status(self, booking_id, status):
        row_index, existing = self.find_row_index(SHEET_BOOKINGS, "BookingID", booking_id)
        if not row_index:
            return False
        existing["Status"] = status
        return self.write_row_by_index(SHEET_BOOKINGS, row_index, existing)

    def delete_booking(self, booking_id):
        row_index, _ = self.find_row_index(SHEET_BOOKINGS, "BookingID", booking_id)
        if not row_index:
            return False
        ws = self._worksheet(SHEET_BOOKINGS)
        ws.delete_rows(row_index)
        return True

    def delete_bookings_for_event(self, event_id):
        self.delete_rows_matching(SHEET_BOOKINGS, "EventID", event_id)

    def mark_booking_attendance(self, booking_id):
        row_index, existing = self.find_row_index(SHEET_BOOKINGS, "BookingID", booking_id)
        if not row_index:
            return False
        
        # We can add a new column "Attended" dynamically
        existing["Attended"] = "Yes"
        existing["AttendedAt"] = str(datetime.utcnow())
        
        return self.write_row_by_index(SHEET_BOOKINGS, row_index, existing)

    # ---------- Attendance ----------
    def get_attendance(self):
        try:
            return self.read_range(SHEET_ATTENDANCE)
        except Exception:
            return []

    def mark_attendance(self, event_id, usn, attended=True, schedule=None, auditorium=None):
        rows = self.read_range(SHEET_ATTENDANCE)
        try:
            ws = self._worksheet(SHEET_ATTENDANCE)
            headers = self._headers(ws)
        except Exception:
            headers = []

        # Find match by EventID, USN, and Schedule (if provided)
        target_schedule = str(schedule).strip() if schedule else ""

        for i, r in enumerate(rows, start=2):
            matched_event = str(r.get("EventID","")).strip() == str(event_id).strip()
            matched_usn = str(r.get("USN","")).strip().lower() == str(usn).strip().lower()
            matched_schedule = True
            if target_schedule:
                matched_schedule = str(r.get("Schedule","")).strip() == target_schedule

            if matched_event and matched_usn and matched_schedule:
                r["Attended"] = "Yes" if attended else "No"
                r["Timestamp"] = str(datetime.utcnow())
                if auditorium:
                    r["Auditorium"] = str(auditorium)
                return self.write_row_by_index(SHEET_ATTENDANCE, i, r)
        
        # append new record
        new_row = {h: "" for h in headers}
        new_row["EventID"] = event_id
        new_row["USN"] = usn
        new_row["Schedule"] = target_schedule
        new_row["Attended"] = "Yes" if attended else "No"
        new_row["Timestamp"] = str(datetime.utcnow())
        if auditorium:
            new_row["Auditorium"] = str(auditorium)
        return self.append_row(SHEET_ATTENDANCE, new_row)

    def delete_attendance_for_event(self, event_id):
        self.delete_rows_matching(SHEET_ATTENDANCE, "EventID", event_id)

    # ---------- Speakers / Coordinators ----------
    def get_speakers(self):
        try:
            return self.read_range(SHEET_SPEAKERS)
        except Exception:
            return []

    def add_speaker(self, sp):
        # sp = { "Name": "", "Photo": "", "Designation": "", "Department": "", "Bio": "" }
        # Check duplicates by Name
        current = self.get_speakers()
        for c in current:
            if str(c.get("Name", "")).lower() == str(sp.get("Name", "")).lower():
                return False # already exists
        
        # Determine ID? Or just append. 
        # Sheet columns: ID, Name, Photo, Designation, Department, Bio
        if "ID" not in sp:
             sp["ID"] = f"SP{len(current) + 1:03d}"
             
        return self.append_row(SHEET_SPEAKERS, sp)

    def update_speaker(self, sp_id, updates):
        row_index, existing = self.find_row_index(SHEET_SPEAKERS, "ID", sp_id)
        if not row_index:
             return False
        for k, v in updates.items():
             existing[k] = v
        return self.write_row_by_index(SHEET_SPEAKERS, row_index, existing)

    def delete_speaker(self, sp_id):
        row_index, _ = self.find_row_index(SHEET_SPEAKERS, "ID", sp_id)
        if not row_index:
            return False
        ws = self._worksheet(SHEET_SPEAKERS)
        ws.delete_rows(row_index)
        return True

    def get_coordinators(self):
        try:
            return self.read_range(SHEET_COORDINATORS)
        except Exception:
            return []

    def add_coordinator(self, coord):
        # coord = { "USN": "", "Name": "", "Photo": "", "Department": "", "Contact": "", "About": "" }
        # Check duplicates by Name (since we only capture Name in the event form usually)
        current = self.get_coordinators()
        for c in current:
            if str(c.get("Name", "")).lower() == str(coord.get("Name", "")).lower():
                return False

        # If USN not provided, generate a placeholder or leave empty
        # Sheet columns: USN, Name, Photo, Department, Contact, About
        if "USN" not in coord or not coord["USN"]:
             coord["USN"] = f"TEMP{len(current) + 1:03d}"

        return self.append_row(SHEET_COORDINATORS, coord)

    def update_coordinator(self, cid, updates):
        # CID is usually USN
        row_index, existing = self.find_row_index(SHEET_COORDINATORS, "USN", cid)
        if not row_index:
             return False
        for k, v in updates.items():
             existing[k] = v
        return self.write_row_by_index(SHEET_COORDINATORS, row_index, existing)

    def delete_coordinator(self, cid):
        row_index, _ = self.find_row_index(SHEET_COORDINATORS, "USN", cid)
        if not row_index:
            return False
        ws = self._worksheet(SHEET_COORDINATORS)
        ws.delete_rows(row_index)
        return True

    def get_auditoriums(self):
        # THIS IS THE OLD HELPER getting names from Events
        # We might want to deprecate this or merge with the new one.
        # For now, let's look at the actual Auditoriums sheet first.
        try:
            # First try to fetch from the new Auditoriums sheet
            auditoriums = self.read_range(SHEET_AUDITORIUMS)
            if auditoriums:
                return sorted([a.get("Name") for a in auditoriums if a.get("Name")])
        except Exception:
            pass
            
        # Fallback to legacy method (reading from events)
        try:
            events = self.read_range(SHEET_EVENTS)
            auditoriums = set()
            for e in events:
                val = e.get("Auditorium", "").strip()
                if val:
                    auditoriums.add(val)
            return sorted(list(auditoriums))
        except Exception:
            return []

    def get_auditoriums_full(self):
        try:
            data = self.read_range(SHEET_AUDITORIUMS)
            print(f"DEBUG: get_auditoriums_full read {len(data)} records")
            return data
        except Exception as e:
            print(f"Error fetching auditoriums: {e}")
            return []

    def add_auditorium(self, audi_data):
        # audi_data = {Name, Capacity, Description, Status, SeatLayout}
        
        # Ensure sheet exists with headers if it's new
        try:
            ws = self.sheet.worksheet(SHEET_AUDITORIUMS)
        except:
             ws = self.sheet.add_worksheet(title=SHEET_AUDITORIUMS, rows=100, cols=10)
        
        # Check if headers exist
        if not ws.row_values(1):
             ws.append_row(["Name", "Capacity", "Description", "Status", "SeatLayout"])

        # Check duplicate name
        current = self.get_auditoriums_full()
        for c in current:
            if str(c.get("Name", "")).lower() == str(audi_data.get("Name", "")).lower():
                return False
        return self.append_row(SHEET_AUDITORIUMS, audi_data)

    def update_auditorium(self, name, updates):
        row_index, existing = self.find_row_index(SHEET_AUDITORIUMS, "Name", name)
        if not row_index:
            return False
        for k, v in updates.items():
            existing[k] = v
        return self.write_row_by_index(SHEET_AUDITORIUMS, row_index, existing)

# single instance to import elsewhere
gs = GoogleSheets()
