from flask import Blueprint, jsonify, request
from backend.services.google_sheets import gs

user_blueprint = Blueprint("users", __name__)

# ------------------------------------------------------
# LOGIN
# ------------------------------------------------------
@user_blueprint.route("/login", methods=["POST"])
def login():
    data = request.json or {}

    role = data.get("role", "user").lower()  # 'admin' or 'user'
    login_id = data.get("loginId") or data.get("usn") or data.get("phone")
    password = data.get("password")

    if not login_id or not password:
        return jsonify({"status": "failed", "message": "Login ID and Password required"}), 400

    users = gs.get_users()

    for u in users:
        # Admin login by USN
        if role == "admin" and str(u.get("USN", "")).lower() == login_id.lower():
            pass
        # User login by Phone
        elif role == "user" and str(u.get("Phone", "")).strip() == str(login_id).strip():
            pass
        else:
            continue

        # Suspend check
        if str(u.get("Suspended", "")).lower() == "yes":
            return jsonify({"status": "failed", "message": "Account suspended"}), 403

        # Password check
        if str(u.get("Password", "")) != str(password):
            return jsonify({"status": "failed", "message": "Incorrect password"}), 401

        user_copy = u.copy()
        user_copy.pop("Password", None)
        user_copy["role"] = u.get("Role", "user").lower()

        return jsonify({
            "status": "success",
            "message": "Login successful",
            "user": user_copy
        }), 200

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
    data = request.json or {}
    
    # Normalize keys to match Google Sheet headers (Capitalized)
    normalized_data = {
        "Name": data.get("name"),
        "Email": data.get("email"),
        "USN": data.get("usn"),
        "College": data.get("college"),
        "Branch": data.get("branch"),
        "Sem": data.get("sem"),
        "Phone": data.get("phone"),
        "Password": data.get("password"),
        "Role": "user",
        "Suspended": "No"
    }
    
    ok = gs.add_user(normalized_data)
    if ok:
        return jsonify({"status": "success"}), 201
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
