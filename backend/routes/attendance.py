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
    
    # Check for existing attendance to prevent duplicates
    try:
        existing_attendance = gs.get_attendance()
        for att in existing_attendance:
            # Match on EventID, USN, and optionally Schedule+Auditorium
            if (str(att.get("EventID","")).strip() == str(event_id).strip() and
                str(att.get("USN","")).strip().lower() == str(usn).strip().lower()):
                
                # If both schedule and auditorium provided, check exact match
                if schedule and auditorium:
                    if (str(att.get("Schedule","")).strip() == str(schedule).strip() and
                        str(att.get("Auditorium","")).strip() == str(auditorium).strip()):
                        return jsonify({
                            "status":"duplicate",
                            "message": f"Already marked attendance for this event at {auditorium}"
                        }), 409
                # If only schedule provided
                elif schedule:
                    if str(att.get("Schedule","")).strip() == str(schedule).strip():
                        return jsonify({
                            "status":"duplicate",
                            "message": "Already marked attendance for this event"
                        }), 409
                # If no schedule/auditorium, just check event+usn
                elif not schedule and not auditorium:
                    return jsonify({
                        "status":"duplicate",
                        "message": "Already marked attendance for this event"
                    }), 409
    except Exception as e:
        print(f"Error checking existing attendance: {e}")
        # Continue to mark attendance if check fails
        
    ok = gs.mark_attendance(event_id, usn, attended, schedule=schedule, auditorium=auditorium)
    if ok:
        return jsonify({"status":"success"}), 200
    return jsonify({"status":"failed","message":"failed to mark attendance"}), 500

