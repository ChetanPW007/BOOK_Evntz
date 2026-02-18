import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify
from flask_cors import CORS
from backend.routes.users import user_blueprint
from backend.routes.bookings import booking_blueprint
from backend.routes.events import event_blueprint
from backend.routes.attendance import attendance_bp

app = Flask(__name__)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://turbo007.pythonanywhere.com",
    "https://book-evntz.vercel.app",
    "https://book-evntz-pw1umm1v3-chetans-projects-c8f1a790.vercel.app",
    "https://book-evntz-wjk3401u7-chetans-projects-c8f1a790.vercel.app",
]

VERCEL_PREVIEW_REGEX = r"https://book-evntz.*\.vercel\.app"

CORS(app, supports_credentials=True, resources={r"/*": {"origins": ALLOWED_ORIGINS + [VERCEL_PREVIEW_REGEX]}})

# ✅ Register blueprints with error handling
try:
    app.register_blueprint(user_blueprint, url_prefix="/api/users")
    print("✅ Registered user_blueprint")
except Exception as e:
    print(f"❌ Failed to register user_blueprint: {e}")

try:
    app.register_blueprint(booking_blueprint, url_prefix="/api/bookings")
    print("✅ Registered booking_blueprint")
except Exception as e:
    print(f"❌ Failed to register booking_blueprint: {e}")

try:
    app.register_blueprint(event_blueprint, url_prefix="/api/events")
    print("✅ Registered event_blueprint")
except Exception as e:
    print(f"❌ Failed to register event_blueprint: {e}")

try:
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    print("✅ Registered attendance_bp")
except Exception as e:
    print(f"❌ Failed to register attendance_bp: {e}")

@app.route("/api/debug/routes")
def list_routes():
    import urllib
    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        line = urllib.parse.unquote(f"{rule.endpoint:50s} {methods:20s} {rule}")
        output.append(line)
    return jsonify(sorted(output))

@app.route("/")
def home():
    return jsonify({"message": "Backend running successfully and connected to Google Sheets!"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
