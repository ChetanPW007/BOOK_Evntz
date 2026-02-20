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
        poster_html = ""
        if booking_details.get("poster"):
            poster_html = f'<img src="{booking_details.get("poster")}" alt="Event Banner" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px 8px 0 0; display: block;">'
        
        qr_html = ""
        if booking_details.get("qr_url"):
            qr_html = f'<div style="text-align: center; margin: 20px 0;"><img src="{booking_details.get("qr_url")}" alt="Ticket QR Code" style="width: 150px; height: 150px; border: 2px dashed #4CAF50; padding: 10px; border-radius: 8px;"></div>'

        # Template
        html_content = f"""
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            {poster_html}
            
            <div style="padding: 30px;">
                <!-- Header with Green Animated-style Check -->
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; padding: 15px; margin-bottom: 10px;">
                        <span style="font-size: 40px; color: #2e7d32; line-height: 1;">✅</span>
                    </div>
                    <h1 style="color: #2e7d32; margin: 0; font-size: 24px; font-weight: 700;">Booking Confirmed!</h1>
                    <p style="color: #666; margin-top: 5px; font-size: 16px;">You are all set, {user_name.split()[0]}! 🎉</p>
                </div>

                <p style="font-size: 16px; line-height: 1.6; color: #444; text-align: center;">
                    Thank you for booking with us. We are thrilled to have you! <br>
                    Here is your official ticket for <strong>{booking_details.get('event_name')}</strong>.
                </p>

                <!-- Ticket Card -->
                <div style="background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin: 25px 0; position: relative;">
                    <div style="border-left: 4px solid #2e7d32; padding-left: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #000; font-size: 18px;">🎟️ Event Details</h3>
                        
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Event</strong>
                            <div style="font-size: 16px; font-weight: 600;">{booking_details.get('event_name')}</div>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <strong style="color: #555; font-size: 12px; text-transform: uppercase;">Date</strong>
                                <div style="font-size: 15px;">{booking_details.get('date')}</div>
                            </div>
                            <div>
                                <strong style="color: #555; font-size: 12px; text-transform: uppercase;">Time</strong>
                                <div style="font-size: 15px;">{booking_details.get('time')}</div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <strong style="color: #555; font-size: 12px; text-transform: uppercase;">Venue</strong>
                                <div style="font-size: 15px;">{booking_details.get('venue')}</div>
                            </div>
                            <div>
                                <strong style="color: #555; font-size: 12px; text-transform: uppercase;">Seats</strong>
                                <div style="font-size: 15px;">{booking_details.get('seats')}</div>
                            </div>
                        </div>

                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc;">
                            <strong style="color: #555; font-size: 12px; text-transform: uppercase;">Booking ID</strong>
                            <div style="font-family: 'Courier New', monospace; font-size: 16px; letter-spacing: 1px; color: #333;">#{booking_details.get('booking_id')}</div>
                        </div>
                    </div>

                    {qr_html}
                    <div style="text-align: center; color: #888; font-size: 12px;">Scan this QR code at the entrance</div>
                </div>

                <div style="text-align: center; font-size: 14px; color: #666; margin-top: 30px;">
                    <p>We hope you have a wonderful time at the event! ✨</p>
                    <p>If you have any questions, feel free to reach out to the coordinators.</p>
                </div>
            </div>

            <div style="background-color: #2e7d32; padding: 15px; text-align: center; color: white; font-size: 12px;">
                © 2026 GM University Auditorium Management<br>
                <a href="#" style="color: #a5d6a7; text-decoration: none;">View My Bookings</a>
            </div>
        </div>
        """
        
        EmailService.send_email_async(user_email, subject, html_content)
