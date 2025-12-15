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
    attended = data.get("attended", True)
    if not event_id or not usn:
        return jsonify({"status":"failed","message":"eventId and usn required"}), 400
    ok = gs.mark_attendance(event_id, usn, attended)
    if ok:
        return jsonify({"status":"success"}), 200
    return jsonify({"status":"failed","message":"failed to mark attendance"}), 500
