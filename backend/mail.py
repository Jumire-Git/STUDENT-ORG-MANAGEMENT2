import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from itsdangerous import URLSafeTimedSerializer
from flask import current_app

# ==========================================
# GMAIL SMTP CONFIGURATION
# ==========================================
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USERNAME = 'STUDENTCOUNCILREPS@gmail.com'  #use real gmail address for live email notifications
MAIL_PASSWORD = 'cgmbmshruqwbyhgu'         #use app password for Gmail (not your regular password) for security reasons must have 2FA enabled on your Gmail account to generate an app password 

def get_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='booking-action-token')

def generate_action_token(booking_id, action):
    """Generates a secure signed token for one-click email approval links."""
    return get_serializer().dumps({'booking_id': booking_id, 'action': action})

def verify_action_token(token, max_age=86400):
    """Verifies the token (valid for 24 hours)."""
    try:
        return get_serializer().loads(token, max_age=max_age)
    except Exception:
        return None

def send_booking_status_email(to_email, recipient_name, booking_ref, venue, date_time, status, purpose, booking_id=None):
    """Sends a live HTML email notification via Gmail SMTP with optional one-click action buttons."""
    
    # Generate action URLs if booking ID is provided
    approve_btn_html = ""
    reject_btn_html = ""
    if booking_id:
        approve_token = generate_action_token(booking_id, 'Approved')
        reject_token = generate_action_token(booking_id, 'Rejected')
        approve_url = f"http://localhost:5000/api/bookings/email-action?token={approve_token}"
        reject_url = f"http://localhost:5000/api/bookings/email-action?token={reject_token}"
        
        approve_btn_html = f'<a href="{approve_url}" class="btn btn-approve">Approve Request</a>'
        reject_btn_html = f'<a href="{reject_url}" class="btn btn-reject">Reject Request</a>'

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }}
        .card {{ background: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }}
        .title {{ color: #1e3a8a; font-size: 20px; font-weight: bold; }}
        .badge {{ display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; color: white; background: {'#10b981' if status == 'Approved' else '#f59e0b' if status == 'Pending' else '#ef4444'}; }}
        .details {{ background: #f8fafc; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; color: #334155; }}
        .btn {{ display: inline-block; padding: 10px 20px; margin: 5px; border-radius: 5px; text-decoration: none; font-weight: bold; color: white; }}
        .btn-approve {{ background: #10b981; }}
        .btn-reject {{ background: #ef4444; }}
        .footer {{ font-size: 12px; color: #64748b; margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">QCU Student Organization Platform</div>
          <div style="font-size: 13px; color: #64748b;">Facility & Equipment Booking Notification</div>
        </div>
        <p>Hello <strong>{recipient_name}</strong>,</p>
        <p>Your booking request status has been updated or generated:</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <span class="badge">{status.upper()}</span>
        </div>

        <div class="details">
          <p><strong>Booking Reference:</strong> {booking_ref}</p>
          <p><strong>Venue / Facility:</strong> {venue}</p>
          <p><strong>Schedule:</strong> {date_time}</p>
          <p><strong>Purpose / Event:</strong> {purpose}</p>
        </div>

        {f'<div style="text-align: center; margin: 25px 0;">{approve_btn_html} {reject_btn_html}</div>' if status == 'Pending' and booking_id else ''}

        <p style="font-size: 13px; color: #475569;">You can log into your dashboard at any time to view all active requests and facility schedules.</p>

        <div class="footer">
          &copy; 2026 Quezon City University · Student Organization Management Platform
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Booking Status Update: {status} ({booking_ref})"
    msg['From'] = MAIL_USERNAME
    msg['To'] = to_email

    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
        server.starttls()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.sendmail(MAIL_USERNAME, to_email, msg.as_string())
        server.quit()
        print(f"[LIVE EMAIL SENT] Successfully delivered email to {to_email}")
        return True
    except Exception as e:
        print(f"[SIMULATED EMAIL NOTIFICATION – GMAIL SMTP FALLBACK]")
        print(f"To: {to_email}")
        print(f"Subject: {msg['Subject']}")
        print(f"Status: {status} | Ref: {booking_ref} | Venue: {venue}")
        print(f"Reason for fallback: {e}")
        return False