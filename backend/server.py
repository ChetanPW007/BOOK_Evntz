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
    "https://book-evntz-wjk3401u7-chetans-projects-c8f1a790.vercel.app",
]

CORS(app, supports_credentials=True, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

# ✅ Register blueprints
app.register_blueprint(user_blueprint, url_prefix="/api/users")
app.register_blueprint(booking_blueprint, url_prefix="/api/bookings")
app.register_blueprint(event_blueprint, url_prefix="/api/events")
app.register_blueprint(attendance_bp, url_prefix="/api/attendance")

@app.route("/")
def home():
    return jsonify({"message": "Backend running successfully and connected to Google Sheets!"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
