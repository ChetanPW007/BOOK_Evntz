# backend/routes/bookings.py
from flask import Blueprint, jsonify, request
from backend.services.google_sheets import gs
import uuid
import urllib.parse
from datetime import datetime

booking_blueprint = Blueprint("bookings", __name__)

@booking_blueprint.route("/", methods=["GET"])
def list_bookings():
    bookings = gs.get_bookings()
    bookings = _merge_attendance(bookings)
    return jsonify({"status":"success","data": bookings}), 200

def _merge_attendance(bookings_list):
    """
    Merges 'Attendance' sheet data into the list of bookings.
    Matches primarily on (EventID, USN).
    """
    try:
        attendance_rows = gs.get_attendance()
        # set of (str(EventID), str(USN).lower())
        attended_keys = set()
        for row in attendance_rows:
            # Check if row is marked 'Yes' (some might be 'No' if we track explicit absence, primarily we track presence)
            if str(row.get("Attendend", "")).lower() == "yes":
                eid = str(row.get("EventID", "")).strip()
                usn = str(row.get("USN", "")).strip().lower()
                attended_keys.add((eid, usn))
        
        for b in bookings_list:
            # If already marked in booking sheet (direct scan), keep it
            if str(b.get("Attended", "")).lower() == "yes":
                continue
            
            # Check linkage
            beid = str(b.get("EventID", "")).strip()
            busn = str(b.get("USN", "")).strip().lower()
            
            if (beid, busn) in attended_keys:
                b["Attended"] = "Yes"
                b["AttendanceSource"] = "Scanner" # Optional debug info
                
                # Try to find the specific attendance row to get Auditorium
                # Optimization: Could store auditorium in attended_keys map as value instead of just set presence
                for row in attendance_rows:
                     if str(row.get("EventID", "")).strip() == beid and str(row.get("USN", "")).strip().lower() == busn:
                         if row.get("Auditorium"):
                             b["AttendedAuditorium"] = str(row.get("Auditorium"))
                         break
                
    except Exception as e:
        print(f"Error merging attendance: {e}")
        # Return bookings as-is if merge fails to avoid breaking UI
        pass
        
    return bookings_list

@booking_blueprint.route("/add", methods=["POST"])
def add_booking():
    data = request.json or {}
    usn = data.get("USN") or data.get("usn") or data.get("user")
    event_id = data.get("EventID") or data.get("event") or data.get("EventId")
    seats = data.get("Seats", data.get("seats",""))
    if isinstance(seats, list):
        seats_str = ",".join(seats)
    else:
        seats_str = str(seats or "")
    if not usn or not event_id:
        return jsonify({"status":"failed","message":"USN and EventID required"}), 400

    # ---------------------------
    # CHECK EXISTING BOOKING
    # ---------------------------
    all_bookings = gs.get_bookings()
    
    # 1. Check if user already booked this event
    for b in all_bookings:
        if str(b.get("EventID")) == str(event_id) and str(b.get("USN")).lower() == str(usn).lower():
             return jsonify({"status":"failed","message":"You have already booked a seat for this event."}), 400

    # 2. Check if seat is already taken (if specific seat passed)
    # seats_str e.g. "A1" or "A1,A2"
    req_seats = [s.strip() for s in seats_str.split(",") if s.strip()]
    if req_seats:
        for b in all_bookings:
            if str(b.get("EventID")) == str(event_id):
                existing_seats = [s.strip() for s in str(b.get("Seats","")).split(",")]
                for rs in req_seats:
                    if rs in existing_seats:
                        return jsonify({"status":"failed","message":f"Seat {rs} is already booked."}), 400

    # Secure short alphanumeric ID (e.g. BK-AB123456)
    # short_id = f"BK-{uuid.uuid4().hex[:8].upper()}"
    
    # ---------------------------
    # TICKET CODE ASSIGNMENT
    # ---------------------------
    import json
    import os
    import random

    # Load codes
    codes_path = os.path.join(os.path.dirname(__file__), "..", "ticket_codes.json")
    chosen_id = f"BK-{uuid.uuid4().hex[:8].upper()}" # fallback
    
    if os.path.exists(codes_path):
        try:
            with open(codes_path, "r") as f:
                codes = json.load(f)
            
            # Find unused code
            # We already have 'all_bookings' from above
            existing_ids = [str(b.get("BookingID")) for b in all_bookings]
            available_codes = [c for c in codes if c not in existing_ids]
            
            if available_codes:
                chosen_id = available_codes[0] # Pick first available or random.choice(available_codes)
            else:
                # Fallback if all used
                chosen_id = f"BK-{uuid.uuid4().hex[:8].upper()}" 
        except Exception as e:
            print(f"Error reading ticket codes: {e}")

    booking = {
        "BookingID": data.get("BookingID") or chosen_id,
        "USN": usn,
        "EventID": event_id,
        "Seats": seats_str,
        "QR URL": data.get("QR URL") or data.get("qr") or f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={urllib.parse.quote_plus(str({'bookingId': data.get('BookingID') or chosen_id}))}",
        "Status": data.get("Status") or data.get("status") or "CONFIRMED",
        "Timestamp": data.get("Timestamp") or datetime.utcnow().timestamp(),
        "Schedule": data.get("Schedule") or data.get("schedule", "")
    }
    booking_id = gs.add_booking(booking)
    # Correctly return the ID stored in the dict, not the boolean result of add_booking
    return jsonify({"status":"success","bookingId": booking["BookingID"]}), 201

@booking_blueprint.route("/delete/<booking_id>", methods=["DELETE"])
def delete_booking(booking_id):
    ok = gs.delete_booking(booking_id)
    if ok:
        return jsonify({"status":"success"}), 200
    return jsonify({"status":"failed","message":"booking not found"}), 404

@booking_blueprint.route("/update_status/<booking_id>", methods=["PUT"])
def update_status(booking_id):
    data = request.json or {}
    status = data.get("status")
    if not status:
        return jsonify({"status":"failed","message":"status required"}), 400
    ok = gs.update_booking_status(booking_id, status)
    if ok:
        return jsonify({"status":"success"}), 200
    return jsonify({"status":"failed","message":"booking not found"}), 404

@booking_blueprint.route("/scan", methods=["POST"])
def scan_booking():
    data = request.json or {}
    booking_id = data.get("bookingId")
    event_id = data.get("eventId")
    
    if not booking_id or not event_id:
        return jsonify({"status":"failed", "message": "Booking ID and Event ID required"}), 400
        
    # 1. Provide Feedback
    all_bookings = gs.get_bookings()
    booking = next((b for b in all_bookings if str(b.get("BookingID")) == str(booking_id)), None)
    
    if not booking:
         return jsonify({"status":"failed", "message": "Invalid Ticket: Booking not found"}), 404
         
    # 2. Check Event Match
    if str(booking.get("EventID")) != str(event_id):
        # Fetch event name for better error
        return jsonify({"status":"failed", "message": "Ticket is for a different event"}), 400
        
    # 3. Check if already attended
    if str(booking.get("Attended", "")).lower() == "yes":
        return jsonify({
            "status":"failed", 
            "message": f"Already Scanned! (User: {booking.get('USN')}, Seats: {booking.get('Seats')})"
        }), 400
        
    # 4. Mark as attended
    ok = gs.mark_booking_attendance(booking_id)
    if ok:
        return jsonify({
            "status": "success", 
            "message": "Verified! Entry Approved.",
            "data": {
                "usn": booking.get("USN"),
                "seats": booking.get("Seats"),
                "schedule": booking.get("Schedule")
            }
        }), 200
        
    return jsonify({"status":"failed", "message": "Server error updating attendance"}), 500

@booking_blueprint.route("/event/<event_id>", methods=["GET"])
def bookings_for_event(event_id):
    bookings = gs.get_bookings()
    filtered = [b for b in bookings if str(b.get("EventID","")) == str(event_id)]
    filtered = _merge_attendance(filtered)
    return jsonify({"status":"success","data": filtered}), 200

@booking_blueprint.route("/user/<usn>", methods=["GET"])
def bookings_for_user(usn):
    try:
        # 1. Fetch ALL data once (Parallel fetch ideally, but sequential here is fine compared to loop)
        bookings = gs.get_bookings()
        events = gs.get_events()
        users = gs.get_users()

        # 2. Create Lookup Maps for O(1) access
        events_map = {str(e.get("ID", "")).strip(): e for e in events}
        # users_map key: normalized USN
        users_map = {str(u.get("USN", "")).strip().lower(): u for u in users}

        filtered = []
        target_usn = str(usn).strip().lower()

        for b in bookings:
            # Check USN match (case insensitive)
            idx_usn = str(b.get("USN","")).strip().lower()
            
            if idx_usn == target_usn:
                # Enrich with Event Details using Map
                event_id = str(b.get("EventID", "")).strip()
                event_details = {}
                
                if event_id in events_map:
                    found = events_map[event_id]
                    event_details = {
                        "eventName": found.get("Name"),
                        "poster": found.get("Poster"),
                        "eventImage": found.get("Poster"),
                        "show": found.get("Time"), # fallback
                        "Date": found.get("Date"), # useful for history display
                    }

                # Enrich with User Details using Map (though we likely know the user)
                user_details = {}
                if idx_usn in users_map:
                    u_found = users_map[idx_usn]
                    user_details = {
                        "userName": u_found.get("Name") or u_found.get("name") or "User"
                    }
                
                # Merge
                full_booking = {**b, **event_details, **user_details}
                filtered.append(full_booking)
                
        return jsonify({"status":"success","success":True, "data": filtered}), 200
    except Exception as e:
        print(f"Error fetching user bookings: {e}")
        return jsonify({"status":"failed", "message": str(e)}), 500
