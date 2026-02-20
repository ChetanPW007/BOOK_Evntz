# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS

# Import blueprints
from backend.routes.users import user_blueprint
from backend.routes.events import event_blueprint
from backend.routes.bookings import booking_blueprint
from backend.routes.attendance import attendance_bp
from backend.routes.auditoriums import auditorium_bp

# Create Flask app
app = Flask(__name__)

# ---------------------------
# CORS Configuration
# ---------------------------
# Allow localhost, production, and ALL Vercel preview deployments
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://turbo007.pythonanywhere.com",
    "https://book-evntz.vercel.app",
    "https://book-evntz-pw1umm1v3-chetans-projects-c8f1a790.vercel.app",
    "https://book-evntz-wjk3401u7-chetans-projects-c8f1a790.vercel.app",
    "https://book-evntz-8lc06te2n-chetans-projects-c8f1a790.vercel.app",
]

# Regex to allow ANY Vercel preview URL for this project
import re
VERCEL_PREVIEW_REGEX = re.compile(r"https://book-evntz.*\.vercel\.app")

CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS + [VERCEL_PREVIEW_REGEX]}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# ---------------------------
# Register Blueprints
# ---------------------------
app.register_blueprint(user_blueprint, url_prefix="/api/users")
app.register_blueprint(event_blueprint, url_prefix="/api/events")
app.register_blueprint(booking_blueprint, url_prefix="/api/bookings")
app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
app.register_blueprint(auditorium_bp, url_prefix="/api/auditoriums")

# ---------------------------
# Test Route
# ---------------------------
@app.route("/")
def home():
    return jsonify({"status": "success", "message": "College Auditorium Backend Running"}), 200

# Global Error Handler to treat all errors as JSON
@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    traceback.print_exc()
    return jsonify({
        "status": "error",
        "message": f"Global Server Error: {str(e)}",
        "type": type(e).__name__
    return jsonify({
        "status": "error",
        "message": f"Global Server Error: {str(e)}",
        "type": type(e).__name__
    }), 500

@app.route("/api/debug/email", methods=["GET"])
def debug_email():
    try:
        from backend.services.email_service import EmailService
        import os
        
        # 1. Check Env Vars
        sender = os.environ.get("EMAIL_SENDER")
        password = os.environ.get("EMAIL_PASSWORD")
        
        if not sender or not password:
            return jsonify({
                "status": "failed", 
                "message": "Credentials missing from environment",
                "sender_set": bool(sender),
                "password_set": bool(password)
            }), 500
            
        # 2. Try Sending
        EmailService.send_email_async(
            to_email=sender, # Send to self
            subject="Test Email from PythonAnywhere",
            body="<h1>It Works!</h1><p>If you see this, email configuration is correct.</p>"
        )
        
        return jsonify({
            "status": "success", 
            "message": f"Test email queued for {sender}",
            "sender": sender
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error", 
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

# ---------------------------
# Start Server
# ---------------------------
if __name__ == "__main__":
    print("Starting backend on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
