from flask import Blueprint, jsonify, request
from backend.services.google_sheets import gs

print("✅ users.py module loaded")


user_blueprint = Blueprint("users", __name__)

# ------------------------------------------------------
# LOGIN
# ------------------------------------------------------
@user_blueprint.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    print(f"DEBUG: Login Attempt received: {data}")

    role = str(data.get("role", "user")).lower()
    login_id = str(data.get("loginId") or data.get("usn") or data.get("phone") or "").strip()
    password = str(data.get("password") or "").strip()

    if not login_id or not password:
        return jsonify({"status": "failed", "message": "Login ID and Password required"}), 400

    users = gs.get_users()
    print(f"DEBUG: Checking against {len(users)} users in sheet")

    # Helper to clean phone numbers (remove .0 from Google Sheets)
    def clean_phone(val):
        s = str(val).split('.')[0].strip()
        return s

    for u in users:
        u_usn = str(u.get("USN", "")).strip().lower()
        u_phone = clean_phone(u.get("Phone", ""))
        u_role = str(u.get("Role", "user")).lower()
        u_pass = str(u.get("Password", "")).strip()

        # Admin login by USN
        if role == "admin" and u_usn == login_id.lower():
            pass
        # User login by USN (New) or Phone (Fallback)
        elif role == "user" and (u_usn == login_id.lower() or u_phone == clean_phone(login_id)):
            pass
        else:
            continue

        # Found user, now check password and status
        print(f"DEBUG: Found matching user profile: {u_usn or u_phone}")

        if str(u.get("Suspended", "")).lower() == "yes":
            print(f"DEBUG: Login failed - Account suspended for {login_id}")
            return jsonify({"status": "failed", "message": "Account suspended"}), 403

        if u_pass != password:
            print(f"DEBUG: Login failed - Password mismatch for {login_id}")
            return jsonify({"status": "failed", "message": "Incorrect password"}), 401

        # Success
        user_copy = u.copy()
        user_copy.pop("Password", None)
        user_copy["role"] = u_role

        if u_role == "admin":
             print(f"DEBUG: Login successful for Admin: {login_id}")
        else:
             print(f"DEBUG: Login successful for User: {u.get('Name', 'Unknown')} ({u_phone})")
        
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "user": user_copy
        }), 200

    print(f"DEBUG: Login failed - User not found for {login_id} (Role: {role})")
    return jsonify({"status": "failed", "message": "User not found"}), 404


# ------------------------------------------------------
# LIST USERS
# ------------------------------------------------------
@user_blueprint.route("/", methods=["GET"])
def list_users():
    users = gs.get_users()
    return jsonify({"status": "success", "users": users}), 200


# ------------------------------------------------------
# ADD USER
# ------------------------------------------------------
@user_blueprint.route("/add", methods=["POST"])
def add_user():
    raw_data = request.json or {}
    print(f"DEBUG: Receiving /users/add payload: {raw_data}") # SERVER LOG
    
    # Helper to get value regardless of casing (e.g. 'name' or 'Name')
    def get_val(key):
        # Case 1: Exact match
        if key in raw_data and raw_data[key]:
            return raw_data[key]
        # Case 2: Lowercase match
        if key.lower() in raw_data and raw_data[key.lower()]:
            return raw_data[key.lower()]
        # Case 3: Loop search
        for k, v in raw_data.items():
            if k.strip().lower() == key.lower():
                return v
        return ""

    # Explicitly map to primary headers (A-J)
    normalized_data = {
        "Name": get_val("Name"),
        "Email": get_val("Email"),
        "USN": get_val("USN"),
        "College": get_val("College"),
        "Branch": get_val("Branch"),
        "Sem": get_val("Sem"),
        "Phone": get_val("Phone"),
        "Password": get_val("Password"),
        "Role": "user",
        "Suspended": "No"
    }
    
    print(f"DEBUG: Normalized data for Sheet: {normalized_data}")
    
    ok = gs.add_user(normalized_data)
    if ok:
        print("DEBUG: User added to Sheet successfully")
        return jsonify({"status": "success"}), 201
    
    print("DEBUG: Failed to add user to Sheet")
    return jsonify({"status": "failed"}), 500


# ------------------------------------------------------
# UPDATE ROLE
# ------------------------------------------------------
@user_blueprint.route("/role", methods=["POST"])
def update_role():
    data = request.json or {}
    usn = data.get("usn")
    role = data.get("role")
    admin_usn = data.get("adminUsn", "")

    if not usn or not role:
        return jsonify({"status": "failed", "message": "usn and role required"}), 400

    if usn.lower() == admin_usn.lower():
        return jsonify({"status": "failed", "message": "cannot change your own role"}), 400

    ok = gs.update_user(usn, {"Role": role})
    if ok:
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "failed", "message": "user not found"}), 404


# ------------------------------------------------------
# SUSPEND USER
# ------------------------------------------------------
@user_blueprint.route("/suspend", methods=["POST"])
def suspend_user():
    data = request.json or {}
    usn = data.get("usn")
    admin_usn = data.get("adminUsn", "")

    if not usn:
        return jsonify({"status": "failed", "message": "usn required"}), 400

    if usn.lower() == admin_usn.lower():
        return jsonify({"status": "failed", "message": "cannot suspend yourself"}), 400

    ok = gs.update_user(usn, {"Suspended": "yes"})
    if ok:
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "failed", "message": "user not found"}), 404


# ------------------------------------------------------
# UNSUSPEND USER
# ------------------------------------------------------
@user_blueprint.route("/unsuspend", methods=["POST"])
def unsuspend_user():
    data = request.json or {}
    usn = data.get("usn")

    if not usn:
        return jsonify({"status": "failed", "message": "usn required"}), 400

    ok = gs.update_user(usn, {"Suspended": ""})
    if ok:
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "failed", "message": "user not found"}), 404


# ------------------------------------------------------
# DELETE USER
# ------------------------------------------------------
@user_blueprint.route("/delete", methods=["POST"])
def delete_user():
    data = request.json or {}
    usn = data.get("usn")
    admin_usn = data.get("adminUsn", "")

    if not usn:
        return jsonify({"status": "failed", "message": "usn required"}), 400

    if usn.lower() == admin_usn.lower():
        return jsonify({"status": "failed", "message": "cannot delete yourself"}), 400

    ok = gs.delete_user(usn)
    if ok:
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "failed", "message": "user not found"}), 404


# ------------------------------------------------------
# GET USER BY USN
# ------------------------------------------------------
@user_blueprint.route("/<usn>", methods=["GET"])
def get_user(usn):
    rows = gs.get_users()
    for r in rows:
        if str(r.get("USN", "")).lower() == usn.lower():
            user = r.copy()
            user.pop("Password", None)
            return jsonify({"status": "success", "user": user}), 200

    return jsonify({"status": "failed", "message": "user not found"}), 404
