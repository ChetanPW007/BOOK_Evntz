from flask import Blueprint, request, jsonify
from backend.services.google_sheets import gs

auditorium_bp = Blueprint("auditorium", __name__)

@auditorium_bp.route("/", methods=["GET"])
def get_auditoriums():
    try:
        data = gs.get_auditoriums_full()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@auditorium_bp.route("/add", methods=["POST"])
def add_auditorium():
    try:
        data = request.json
        if not data.get("Name"):
            return jsonify({"status": "error", "message": "Auditorium Name is required"}), 400
        
        # Ensure SeatLayout is a string if it's a dict/json
        import json
        if data.get("SeatLayout") and not isinstance(data["SeatLayout"], str):
             data["SeatLayout"] = json.dumps(data["SeatLayout"])

        success = gs.add_auditorium(data)
        if success:
            return jsonify({"status": "success", "message": "Auditorium added"})
        else:
            return jsonify({"status": "error", "message": "Failed to add (maybe duplicate name?)"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@auditorium_bp.route("/update/<name>", methods=["PUT"])
def update_auditorium(name):
    try:
        updates = request.json
        
        # Ensure SeatLayout is a string if present
        import json
        if updates.get("SeatLayout") and not isinstance(updates["SeatLayout"], str):
             updates["SeatLayout"] = json.dumps(updates["SeatLayout"])

        success = gs.update_auditorium(name, updates)
        if success:
            return jsonify({"status": "success", "message": "Auditorium updated"})
        else:
            return jsonify({"status": "error", "message": "Auditorium not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
