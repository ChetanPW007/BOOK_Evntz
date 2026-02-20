# backend/routes/attendance.py
from flask import Blueprint, request, jsonify
from backend.services.google_sheets import gs

attendance_bp = Blueprint("attendance", __name__)

@attendance_bp.route("/list", methods=["GET"])
def list_attendance():
    rows = gs.get_attendance()
    return jsonify({"status":"success","data": rows}), 200

@attendance_bp.route("/mark", methods=["POST"])
def mark():
    data = request.json or {}
    event_id = data.get("eventId") or data.get("EventID") or data.get("event")
    usn = data.get("usn") or data.get("USN") or data.get("user")
    schedule = data.get("schedule") or data.get("Schedule")
    auditorium = data.get("auditorium") or data.get("Auditorium")
    attended = data.get("attended", True)
    
    if not event_id or not usn:
        return jsonify({"status":"failed","message":"eventId and usn required"}), 400
    
    
    # Check if booking is ALREADY marked as attended (true duplicate)
    # Only block if the BOOKING has Attended=Yes, not just if attendance record exists
    try:
        existing_bookings = gs.get_bookings()
        for booking in existing_bookings:
            # Match on EventID and USN
            if (str(booking.get("EventID","")).strip() == str(event_id).strip() and
                str(booking.get("USN","")).strip().lower() == str(usn).strip().lower()):
                
                # Check if this booking is ALREADY marked as attended
                if str(booking.get("Attended", "")).lower() == "yes":
                    return jsonify({
                        "status":"duplicate",
                        "message": f"Already checked in! User: {usn}, Seats: {booking.get('Seats', '')}"
                    }), 409
    except Exception as e:
        print(f"Error checking booking attendance: {e}")
        # Continue to mark attendance if check fails
        
    # Look up EventName and user Email for the attendance record
    event_name = ""
    user_email = ""
    try:
        events_list = gs.get_events()
        ev_match = next((e for e in events_list if str(e.get("ID", "")).strip() == str(event_id).strip()), None)
        if ev_match:
            event_name = ev_match.get("Name", "")
        
        users_list = gs.get_users()
        user_match = next((u for u in users_list if str(u.get("USN", "")).strip().lower() == str(usn).strip().lower()), None)
        if user_match:
            user_email = user_match.get("Email", "")
    except Exception as e:
        print(f"Error looking up event/user for attendance: {e}")
        
    ok = gs.mark_attendance(event_id, usn, attended, schedule=schedule, auditorium=auditorium, event_name=event_name, email=user_email)
    if ok:
        return jsonify({"status":"success"}), 200
    return jsonify({"status":"failed","message":"failed to mark attendance"}), 500


