from flask import Blueprint, jsonify, request
from backend.services.google_sheets import gs
import json

event_blueprint = Blueprint("events", __name__)

# ---------------------------
# GET ALL EVENTS
# ---------------------------
@event_blueprint.route("/", methods=["GET"])
def list_events():
    events = gs.get_events()
    return jsonify({"status": "success", "events": events}), 200


# ---------------------------
# ADD EVENT
# ---------------------------
import base64
import os

# ---------------------------
# ADD EVENT
# ---------------------------
@event_blueprint.route("/add", methods=["POST"])
def add_event():
    data = request.json or {}

    ev = {
        "ID": data.get("ID", ""),
        "Name": data.get("Name") or data.get("name", ""),
        "Auditorium": data.get("Auditorium") or data.get("auditorium", ""),
        "Date": data.get("Date") or data.get("date", ""),
        "Time": data.get("Time") or data.get("time", ""),
        "Speakers": data.get("Speakers") or data.get("speakers", ""),
        "Coordinators": data.get("Coordinators") or data.get("coordinators", ""),
        "College": data.get("College") or data.get("college", ""),
        "Capacity": data.get("Capacity") or data.get("capacity", ""),
        "Poster": data.get("Poster") or data.get("poster", ""),
        "About": data.get("About") or data.get("about", ""),
        "Visibility": data.get("Visibility", "visible"),
        "Featured": str(data.get("Featured", "false")), # Force string
        "SeatLayout": data.get("SeatLayout", ""),
        "Schedules": data.get("Schedules", ""), # JSON string or already list? Ideally stored as JSON string in sheet
        "Duration": data.get("Duration", ""),
        "PublishAt": data.get("PublishAt", "") 
    }

    # Ensure Schedules is stored as string if it came as object
    if isinstance(ev["Schedules"], (list, dict)):
        ev["Schedules"] = json.dumps(ev["Schedules"])

    try:
        # Pre-process Poster if Base64
        # We need an ID to name the file. If we rely on gs.add_event to generate ID, we don't have it yet.
        # But we can generate a temporary filename or use UUID and hope gs overwrites ID?
        # Actually, gs.add_event generates ID if missing.
        # Let's generate ID here to be safe and use it for filename.
        # BUT relying on gs logic is better for sequence.
        # TRADEOFF: We'll modify `gs` to return the ID it used? 
        # Easier: Just use a UUID for the FILENAME to ensure uniqueness, unrelated to EV ID.
        
        poster_data = str(ev.get("Poster", ""))
        print(f"DEBUG: Poster Data Type: {type(poster_data)}", flush=True)
        print(f"DEBUG: Poster Data Len: {len(poster_data)}", flush=True)

        # If it's a long string and NOT a URL, assume it's base64 image data
        if len(poster_data) > 500 and not poster_data.startswith("http"):
            print("DEBUG: Entering Poster Processing Block", flush=True)
            try:
                # Handle header if present
                if "base64," in poster_data:
                    header, encoded = poster_data.split(",", 1)
                else:
                    encoded = poster_data
                    # header = "data:image/png;base64" 

                # Determine extension
                ext = "png"
                if "jpeg" in poster_data or "jpg" in poster_data: # simple check
                    ext = "jpg"
                
                import uuid
                filename = f"poster_{uuid.uuid4().hex}.{ext}"
                
                # Path construction
                save_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
                if not os.path.exists(save_dir):
                    os.makedirs(save_dir, exist_ok=True)
                    
                file_path = os.path.join(save_dir, filename)
                
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(encoded))
                
                print(f"DEBUG: Saved poster to: {file_path}", flush=True)
                # URL to store
                base_url = request.host_url.rstrip('/')
                ev["Poster"] = f"{base_url}/static/uploads/{filename}"
                print(f"DEBUG: New Poster URL: {ev['Poster']}", flush=True)
                
            except Exception as e:
                print(f"DEBUG: Error saving poster: {e}", flush=True)
                # CRITICAL: Clear poster if save fails to avoid 50000 char limit error
                ev["Poster"] = ""
        else:
            print("DEBUG: Skipped Poster Processing Block", flush=True)

        # -----------------------------
        # PROCESS SPEAKERS & COORDINATORS
        # -----------------------------
        
        # 1. Handle Speakers
        speakers_raw = ev.get("Speakers", "")
        speakers_list = []
        try:
            if speakers_raw:
                if isinstance(speakers_raw, str):
                    try:
                        speakers_list = json.loads(speakers_raw)
                    except:
                        # Maybe just a name string?
                        speakers_list = [{"name": speakers_raw}]
                elif isinstance(speakers_raw, list):
                    speakers_list = speakers_raw
                
                # Now loop through and process images + sync to Sheet
                for sp in speakers_list:
                    # sp = {name, dept, about, image}
                    sp_img = str(sp.get("image", ""))
                    if len(sp_img) > 200 and not sp_img.startswith("http"):
                        # Save Image
                        try:
                            if "base64," in sp_img:
                                _, encoded = sp_img.split(",", 1)
                            else:
                                encoded = sp_img
                            
                            ext = "jpg" if "jpeg" in sp_img or "jpg" in sp_img else "png"
                            fn = f"sp_{uuid.uuid4().hex}.{ext}"
                            path = os.path.join(save_dir, fn)
                            with open(path, "wb") as f:
                                f.write(base64.b64decode(encoded))
                            
                            base_url = request.host_url.rstrip('/')
                            sp["image"] = f"{base_url}/static/uploads/{fn}"
                        except Exception as e:
                            print(f"Speaker Image Save Error: {e}")
                            sp["image"] = "" # clear invalid base64
                    
                    # Sync to Sheet
                    gs.add_speaker({
                        "Name": sp.get("name", ""),
                        "Photo": sp.get("image", ""),
                        "Designation": sp.get("role") or sp.get("dept", ""),
                        "Department": sp.get("dept", ""),
                        "Bio": sp.get("about", "")
                    })
                
                # Update event with processed list (images as URLs)
                ev["Speakers"] = json.dumps(speakers_list)
        except Exception as e:
            print(f"Speaker Processing Error: {e}")

        # 2. Handle Coordinators (now JSON array like speakers)
        coords_raw = ev.get("Coordinators", "")
        try:
            if coords_raw:
                coords_list = []
                if isinstance(coords_raw, str):
                    try:
                        coords_list = json.loads(coords_raw)
                    except:
                        # Maybe old format: comma-separated string
                        coords_list = [{"name": x.strip()} for x in coords_raw.split(",") if x.strip()]
                elif isinstance(coords_raw, list):
                    coords_list = coords_raw
                
                # Now loop through and process images + sync to Sheet
                for coord in coords_list:
                    # coord = {name, dept, about, image}
                    coord_img = str(coord.get("image", ""))
                    if len(coord_img) > 200 and not coord_img.startswith("http"):
                        # Save Image
                        try:
                            if "base64," in coord_img:
                                _, encoded = coord_img.split(",", 1)
                            else:
                                encoded = coord_img
                            
                            ext = "jpg" if "jpeg" in coord_img or "jpg" in coord_img else "png"
                            fn = f"coord_{uuid.uuid4().hex}.{ext}"
                            path = os.path.join(save_dir, fn)
                            with open(path, "wb") as f:
                                f.write(base64.b64decode(encoded))
                            
                            base_url = request.host_url.rstrip('/')
                            coord["image"] = f"{base_url}/static/uploads/{fn}"
                        except Exception as e:
                            print(f"Coordinator Image Save Error: {e}")
                            coord["image"] = "" # clear invalid base64
                    
                    # Sync to Sheet
                    gs.add_coordinator({
                        "Name": coord.get("name", ""),
                        "Photo": coord.get("image", ""),
                        "Department": coord.get("dept", ""),
                        "Contact": "", 
                        "About": coord.get("about", "")
                    })
                
                # Update event with processed list (images as URLs)
                ev["Coordinators"] = json.dumps(coords_list)
        except Exception as e:
            print(f"Coordinator Processing Error: {e}")

        
        ok = gs.add_event(ev)
        if ok:
            return jsonify({"status": "success"}), 201
        return jsonify({"status": "failed", "message": "Unknown error in google sheet append"}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Add Event Error: {e}", flush=True)
        return jsonify({"status": "failed", "message": f"Server Error: {str(e)}"}), 500


# ---------------------------
# UPDATE EVENT
# ---------------------------
@event_blueprint.route("/update/<event_id>", methods=["PUT"])
def update_event(event_id):
    data = request.json or {}
    updates = {}

    allowed_keys = [
        "Name", "Auditorium", "Date", "Time", "Speakers", "Coordinators",
        "College", "Capacity", "Poster", "About", "Visibility", "SeatLayout",
        "Schedules", "Duration", "PublishAt", "Featured"
    ]

    for key in allowed_keys:
        if key in data:
            val = data[key]
            # Serialize if needed
            if key == "Schedules" and isinstance(val, (list, dict)):
                val = json.dumps(val)
            updates[key] = val

    ok = gs.update_event(event_id, updates)
    if ok:
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "failed", "message": "event not found"}), 404


# ---------------------------
# DELETE EVENT
# ---------------------------
@event_blueprint.route("/delete/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    ok = gs.delete_event(event_id)
    if ok:
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "failed", "message": "event not found"}), 404

# ---------------------------
# CHECK CONFLICTS
# ---------------------------
@event_blueprint.route("/check_conflict", methods=["POST"])
def check_conflict():
    try:
        data = request.json or {}
        auditorium = data.get("Auditorium")
        schedules = data.get("Schedules", []) # List of {Date: "YYYY-MM-DD", Time: "HH:MM"}
        duration_str = data.get("Duration", "") # "2h 30m" or ""
        exclude_event_id = data.get("ExcludeEventID") # For updates
        
        if not auditorium or not schedules:
            return jsonify({"status": "success", "conflicts": []}), 200
            
        # Helper to parse time
        from datetime import datetime, timedelta
        
        def parse_dt(d, t):
            try:
                # Basic cleanup
                t = t.strip()
                if len(t) == 5: t = t # HH:MM
                # Check format
                return datetime.strptime(f"{d} {t}", "%Y-%m-%d %H:%M")
            except:
                return None
                
        # Parse Duration
        duration_minutes = 0
        if duration_str:
            try:
                parts = duration_str.lower().split()
                for p in parts:
                    if 'h' in p:
                        duration_minutes += int(p.replace('h','')) * 60
                    elif 'm' in p:
                        duration_minutes += int(p.replace('m',''))
            except:
                pass
                
        # Default duration if not provided (e.g. 3 hours)
        if duration_minutes == 0:
            duration_minutes = 180 
            
        # 1. Get All Events
        all_events = gs.get_events()
        conflicts = []
        
        for req_slot in schedules:
            req_start = parse_dt(req_slot.get("Date"), req_slot.get("Time"))
            if not req_start: continue
            req_end = req_start + timedelta(minutes=duration_minutes)
            
            for ev in all_events:
                if ev.get("ID") == exclude_event_id: continue
                if ev.get("Auditorium") != auditorium: continue
                
                # Existing event schedules
                ev_schedules = []
                if ev.get("Schedules"):
                    try:
                        ev_schedules = json.loads(ev.get("Schedules"))
                    except:
                        pass
                
                if not ev_schedules:
                    ev_schedules = [{"Date": ev.get("Date"), "Time": ev.get("Time")}]
                
                # Existing Duration
                ev_dur_mins = 180 
                if ev.get("Duration"):
                    try:
                        d_str = ev.get("Duration").lower()
                        dm = 0
                        for p in d_str.split():
                            if 'h' in p: dm += int(p.replace('h','')) * 60
                            elif 'm' in p: dm += int(p.replace('m',''))
                        if dm > 0: ev_dur_mins = dm
                    except:
                        pass
                
                for ev_slot in ev_schedules:
                    ev_start = parse_dt(ev_slot.get("Date"), ev_slot.get("Time"))
                    if not ev_start: continue
                    ev_end = ev_start + timedelta(minutes=ev_dur_mins)
                    
                    # Overlap logic: StartA < EndB AND StartB < EndA
                    if req_start < ev_end and ev_start < req_end:
                        conflicts.append({
                            "Date": req_slot.get("Date"),
                            "Time": req_slot.get("Time"),
                            "Reason": f"Booked by '{ev.get('Name')}'"
                        })
                        break 
        
        return jsonify({"status": "success", "conflicts": conflicts}), 200
    except Exception as e:
        print(f"Conflict Check Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ---------------------------
# SET EVENT VISIBILITY
# ---------------------------
@event_blueprint.route("/visibility/<event_id>", methods=["PUT"])
def set_visibility(event_id):
    data = request.json or {}
    flag = data.get("visibility", "visible")

    ok = gs.toggle_event_visibility(event_id, flag)
    if ok:
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "failed", "message": "event not found"}), 404


# ---------------------------
# GET SPEAKERS
# ---------------------------
@event_blueprint.route("/speakers", methods=["GET"])
def get_speakers():
    speakers = gs.get_speakers()
    return jsonify({"status": "success", "data": speakers}), 200


# ---------------------------
# GET COORDINATORS
# ---------------------------
@event_blueprint.route("/coordinators", methods=["GET"])
def get_coordinators():
    coordinators = gs.get_coordinators()
    return jsonify({"status": "success", "data": coordinators}), 200

# ---------------------------
# GET AUDITORIUMS
# ---------------------------
@event_blueprint.route("/auditoriums", methods=["GET"])
def get_auditoriums():
    data = gs.get_auditoriums()
    return jsonify({"status": "success", "data": data}), 200

# ---------------------------
# ADD SPEAKER (Direct)
# ---------------------------
@event_blueprint.route("/speakers/add", methods=["POST"])
def add_speaker():
    data = request.json or {}
    # Process image if base64
    sp_img = str(data.get("image", ""))
    if len(sp_img) > 200 and not sp_img.startswith("http"):
        try:
            if "base64," in sp_img:
                _, encoded = sp_img.split(",", 1)
            else:
                encoded = sp_img
            
            ext = "png"
            if "jpeg" in sp_img or "jpg" in sp_img: ext = "jpg"
            
            import uuid
            fn = f"sp_{uuid.uuid4().hex}.{ext}"
            
            save_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
            if not os.path.exists(save_dir):
                os.makedirs(save_dir, exist_ok=True)
                
            path = os.path.join(save_dir, fn)
            with open(path, "wb") as f:
                f.write(base64.b64decode(encoded))
            
            base_url = request.host_url.rstrip('/')
            data["image"] = f"{base_url}/static/uploads/{fn}"
        except Exception:
            data["image"] = ""

    gs.add_speaker({
        "Name": data.get("name", ""),
        "Photo": data.get("image", ""),
        "Designation": data.get("role", ""),
        "Department": data.get("dept", ""),
        "Bio": data.get("about", "")
    })
    return jsonify({"status": "success"}), 201

# ---------------------------
# ADD COORDINATOR (Direct)
# ---------------------------
@event_blueprint.route("/coordinators/add", methods=["POST"])
def add_coordinator_endpoint():
    data = request.json or {}
    
    # Process image if base64 (similar logic)
    c_img = str(data.get("image", ""))
    if len(c_img) > 200 and not c_img.startswith("http"):
        try:
            if "base64," in c_img:
                _, encoded = c_img.split(",", 1)
            else:
                encoded = c_img
            
            ext = "png"
            if "jpeg" in c_img or "jpg" in c_img: ext = "jpg"
            
            import uuid
            fn = f"coord_{uuid.uuid4().hex}.{ext}"
            
            save_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
            if not os.path.exists(save_dir):
                os.makedirs(save_dir, exist_ok=True)
            
            path = os.path.join(save_dir, fn)
            with open(path, "wb") as f:
                f.write(base64.b64decode(encoded))
            
            base_url = request.host_url.rstrip('/')
            data["image"] = f"{base_url}/static/uploads/{fn}"
        except Exception:
            data["image"] = ""

    gs.add_coordinator({
        "Name": data.get("name", ""),
        "Photo": data.get("image", ""),
        "Department": data.get("dept", ""),
        "Contact": data.get("contact", ""), 
        "About": data.get("about", "")
    })
    return jsonify({"status": "success"}), 201

# ---------------------------
# DELETE SPEAKER
# ---------------------------
@event_blueprint.route("/speakers/delete/<speaker_id>", methods=["DELETE"])
def delete_speaker(speaker_id):
    try:
        success = gs.delete_speaker(speaker_id)
        if success:
            return jsonify({"status": "success", "message": "Speaker deleted"}), 200
        else:
            return jsonify({"status": "error", "message": "Speaker not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---------------------------
# DELETE COORDINATOR
# ---------------------------
@event_blueprint.route("/coordinators/delete/<coordinator_id>", methods=["DELETE"])
def delete_coordinator(coordinator_id):
    try:
        success = gs.delete_coordinator(coordinator_id)
        if success:
            return jsonify({"status": "success", "message": "Coordinator deleted"}), 200
        else:
            return jsonify({"status": "error", "message": "Coordinator not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
