from flask import Blueprint, jsonify, request
from database import get_db_connection
from mail import send_booking_status_email
from mail import verify_action_token

bookings_bp = Blueprint('bookings', __name__)

@bookings_bp.route('/api/venues', methods=['GET'])
def get_venues():
    conn = get_db_connection()
    try:
        venues = conn.execute('SELECT * FROM venues').fetchall()
        venues_list = [
            {
                "id": v["id"],
                "name": v["name"],
                "type": v["type"],
                "capacity": v["capacity"],
                "approver_email": v["approver_email"]
            }
            for v in venues
        ]
    finally:
        conn.close()
    return jsonify(venues_list), 200

@bookings_bp.route('/api/current-user', methods=['GET'])
def get_current_user():
    try:
        user_id = int(request.args.get('user_id', 1))
    except (ValueError, TypeError):
        user_id = 1

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            user = conn.execute('SELECT * FROM users LIMIT 1').fetchone()
        
        if user:
            user_dict = dict(user)
            name = str(user_dict.get('name', '')).lower()
            
            if 'role' in user_dict and user_dict['role']:
                role_val = str(user_dict['role'])
            elif user_id == 1 or 'juan' in name or 'admin' in name:
                role_val = 'Admin'
            elif 'dr.' in name or 'roberto' in name or 'faculty' in name or user_dict.get('department'):
                role_val = 'Faculty'
            else:
                role_val = 'Student'
            
            user_dict['role'] = role_val
            return jsonify(user_dict), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@bookings_bp.route('/api/bookings', methods=['GET'])
def get_bookings():
    conn = get_db_connection()
    try:
        query = '''
            SELECT b.id, b.status, b.event_description, b.start_time, b.end_time,
                   v.name as venue_name, u.name as requester_name, MIN(c.name) as club_name
            FROM bookings b
            LEFT JOIN venues v ON b.venue_id = v.id
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN club_members cm ON u.id = cm.user_id
            LEFT JOIN clubs c ON cm.club_id = c.id
            GROUP BY b.id
        '''
        rows = conn.execute(query).fetchall()
        bookings_list = []
        for r in rows:
            full_start = r["start_time"] or ""
            date_str = " ".join(full_start.split()[:3]) if full_start else "Nov 2026"
            time_str = " ".join(full_start.split()[3:]) if len(full_start.split()) > 3 else "1:00 PM"

            bookings_list.append({
                "id": r["id"],
                "ref": f"#BK-0{r['id'] + 40}",
                "club": r["club_name"] or "Campus Club",
                "requester": r["requester_name"] or "Student Requester",
                "venue": r["venue_name"] or "Auditorium A",
                "date": date_str,
                "time": time_str,
                "purpose": r["event_description"],
                "status": r["status"],
                "equipment": "Standard Setup"
            })
    finally:
        conn.close()
    return jsonify(bookings_list), 200

@bookings_bp.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.get_json() or {}
    
    venue_name = data.get('venue')
    date_val = data.get('date')
    start_time = data.get('startTime', '1:00 PM')
    end_time = data.get('endTime', '5:00 PM')
    purpose = data.get('purpose')
    user_id = data.get('userId', 1)
    
    if not venue_name or not date_val or not purpose:
        return jsonify({"error": "Missing required booking fields"}), 400

    conn = get_db_connection()
    try:
        venue_row = conn.execute('SELECT id FROM venues WHERE name = ?', (venue_name,)).fetchone()
        venue_id = venue_row['id'] if venue_row else 1

        formatted_start = f"{date_val} {start_time}"
        formatted_end = f"{date_val} {end_time}"

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO bookings (venue_id, user_id, event_description, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, 'Pending')
        ''', (venue_id, user_id, purpose, formatted_start, formatted_end))
        
        conn.commit()
        new_id = cursor.lastrowid

        # Fetch user info to send confirmation receipt email
        user_row = conn.execute('SELECT name, email FROM users WHERE id = ?', (user_id,)).fetchone()
        if user_row:
            booking_ref = f"#BK-0{new_id + 40}"
            send_booking_status_email(
                to_email=user_row['email'],
                recipient_name=user_row['name'],
                booking_ref=booking_ref,
                venue=venue_name,
                date_time=f"{formatted_start} to {formatted_end}",
                status="Pending",
                purpose=purpose
            )

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    return jsonify({
        "success": True,
        "message": "Booking request submitted successfully! Confirmation receipt generated.",
        "booking_id": new_id
    }), 201

@bookings_bp.route('/api/bookings/<int:booking_id>/status', methods=['PUT'])
def update_booking_status(booking_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['Approved', 'Denied', 'Rejected', 'Pending']:
        return jsonify({"error": "Invalid status"}), 400

    conn = get_db_connection()
    try:
        # Fetch booking and requester details before updating status
        booking_info = conn.execute('''
            SELECT b.id, b.event_description, b.start_time,
                   v.name as venue_name, u.name as requester_name, u.email as requester_email
            FROM bookings b
            LEFT JOIN venues v ON b.venue_id = v.id
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        ''', (booking_id,)).fetchone()

        conn.execute('UPDATE bookings SET status = ? WHERE id = ?', (new_status, booking_id))
        conn.commit()

        # Send status update email (Approval / Denial)
        if booking_info:
            booking_ref = f"#BK-0{booking_info['id'] + 40}"
            send_booking_status_email(
                to_email=booking_info['requester_email'] or 'student@qcu.edu.ph',
                recipient_name=booking_info['requester_name'] or 'Requester',
                booking_ref=booking_ref,
                venue=booking_info['venue_name'] or 'Auditorium A',
                date_time=booking_info['start_time'] or 'Nov 2026',
                status=new_status,
                purpose=booking_info['event_description'] or 'Facility Reservation'
            )

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    return jsonify({
        "success": True,
        "message": f"Booking status updated to {new_status} and notification sent"
    }), 200

@bookings_bp.route('/api/bookings/email-action', methods=['GET'])
def email_action():
    """Allows approvers to Approve or Reject bookings with one click directly from Gmail."""
    token = request.args.get('token')
    if not token:
        return "<h3>Invalid or missing approval token.</h3>", 400

    data = verify_action_token(token)
    if not data:
        return "<h3>Approval link has expired or is invalid. Please use the web dashboard.</h3>", 400

    booking_id = data.get('booking_id')
    new_status = data.get('action') # 'Approved' or 'Rejected'

    conn = get_db_connection()
    try:
        booking = conn.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,)).fetchone()
        if not booking:
            return "<h3>Booking request not found.</h3>", 404

        conn.execute('UPDATE bookings SET status = ? WHERE id = ?', (new_status, booking_id))
        conn.commit()
    except Exception as e:
        return f"<h3>Database error: {e}</h3>", 500
    finally:
        conn.close()

    color = "#10b981" if new_status == "Approved" else "#ef4444"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <title>Booking Action Confirmation</title>
      <style>
        body {{ font-family: Arial, sans-serif; background: #f4f6f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
        .card {{ background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }}
        .badge {{ font-size: 22px; font-weight: bold; color: {color}; margin-bottom: 20px; }}
        p {{ color: #334155; line-height: 1.6; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Booking {new_status}!</div>
        <p>The facility booking request <strong>#BK-0{booking_id + 40}</strong> has been successfully <strong>{new_status.lower()}</strong> in real-time.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">You may now close this browser tab.</p>
      </div>
    </body>
    </html>
    """, 200