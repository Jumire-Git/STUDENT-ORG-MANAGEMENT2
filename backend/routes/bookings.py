from flask import Blueprint, jsonify
from database import get_db_connection

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

@bookings_bp.route('/api/bookings', methods=['GET'])
def get_bookings():
    conn = get_db_connection()
    try:
        query = '''
            SELECT b.id, b.status, b.event_description, b.start_time, b.end_time,
                   v.name as venue_name, u.name as requester_name, c.name as club_name
            FROM bookings b
            LEFT JOIN venues v ON b.venue_id = v.id
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN club_members cm ON u.id = cm.user_id
            LEFT JOIN clubs c ON cm.club_id = c.id
        '''
        rows = conn.execute(query).fetchall()
        bookings_list = []
        for r in rows:
            full_start = r["start_time"] or ""
            # Extracts clean date like 'Nov 3, 2026' instead of just 'Nov'
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