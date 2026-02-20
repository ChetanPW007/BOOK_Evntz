import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.config import EMAIL_SENDER, EMAIL_PASSWORD
import threading

class EmailService:
    @staticmethod
    def send_email_async(to_email, subject, html_content):
        """Runs email sending in a separate thread to avoid blocking"""
        thread = threading.Thread(target=EmailService.send_email, args=(to_email, subject, html_content))
        thread.start()

    @staticmethod
    def send_email(to_email, subject, html_content):
        if not EMAIL_SENDER or not EMAIL_PASSWORD:
            print("Email credentials not set. Skipping email.")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = EMAIL_SENDER
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            # Connect to Gmail SMTP
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(EMAIL_SENDER, EMAIL_PASSWORD)
                server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
            
            print(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    @staticmethod
    def send_booking_confirmation(user_email, user_name, booking_details):
        subject = f"Booking Confirmed: {booking_details.get('event_name')} - {booking_details.get('booking_id')}"
        
        # Template
        html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <!-- Official Section -->
            <div style="border-bottom: 2px solid #0056b3; padding-bottom: 20px; margin-bottom: 20px;">
                <h2 style="color: #0056b3;">Booking Confirmation</h2>
                <p>Dear <strong>{user_name}</strong>,</p>
                <p>We are pleased to confirm your booking for the following event:</p>
                <ul style="line-height: 1.6;">
                    <li><strong>Event:</strong> {booking_details.get('event_name')}</li>
                    <li><strong>Venue:</strong> {booking_details.get('venue')}</li>
                    <li><strong>Date:</strong> {booking_details.get('date')}</li>
                    <li><strong>Time:</strong> {booking_details.get('time')}</li>
                    <li><strong>Booking ID:</strong> <span style="font-family: monospace; background: #eee; padding: 2px 5px; border-radius: 4px;">{booking_details.get('booking_id')}</span></li>
                    <li><strong>Seats:</strong> {booking_details.get('seats')}</li>
                </ul>
                <p>Please present your ticket (QR Code) at the venue entrance.</p>
                <p style="margin-top: 20px; font-size: 0.9em; color: #555;">
                    Regards,<br>
                    <strong>GM University Management</strong>
                </p>
            </div>

            <!-- GenZ Section -->
            <div style="background-color: #f0f8ff; padding: 20px; border-radius: 12px; font-family: 'Courier New', monospace; border: 1px dashed #d63384;">
                <h3 style="margin-top: 0; color: #d63384; font-size: 1.2em;">Yo {user_name.split()[0]}! 👋</h3>
                <p>You're all set! 🎟️ <strong>{booking_details.get('event_name')}</strong> is gonna be lit! 🔥</p>
                <p>Pull up to <strong>{booking_details.get('venue')}</strong> on <strong>{booking_details.get('date')}</strong> @ {booking_details.get('time')}.</p>
                <p>No flaunting, just vibing. Don't ghost us! 👻 See ya there!</p>
                <p style="margin-bottom: 0;">Peace out, ✌️<br>GM University Team</p>
            </div>
        </div>
        """
        
        EmailService.send_email_async(user_email, subject, html_content)
