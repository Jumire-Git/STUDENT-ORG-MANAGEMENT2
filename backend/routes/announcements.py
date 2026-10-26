from flask import Blueprint, jsonify, request
from database import get_db_connection

announcements_bp = Blueprint('announcements', __name__)

@announcements_bp.route('/api/announcements', methods=['GET'])
def list_announcements():
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT a.id, a.title, a.body, a.created_at,
               u.name AS author, c.name AS club
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        LEFT JOIN clubs c ON c.id = a.club_id
        ORDER BY a.created_at DESC
        LIMIT 20
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200


@announcements_bp.route('/api/announcements', methods=['POST'])
def create_announcement():
    email = (request.headers.get('X-User-Email') or '').strip().lower()
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    body = (data.get('body') or '').strip()

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE lower(email) = ?', (email,)).fetchone()

    if not user or user['role'] not in ('officer', 'admin'):
        conn.close()
        return jsonify({"error": "Only officers can post announcements"}), 403
    if not title or not body:
        conn.close()
        return jsonify({"error": "Title and message are required"}), 400

    row = conn.execute('SELECT club_id FROM club_members WHERE user_id = ? LIMIT 1',
                       (user['id'],)).fetchone()
    club_id = row['club_id'] if row else data.get('club_id')

    conn.execute(
        'INSERT INTO announcements (club_id, author_id, title, body) VALUES (?, ?, ?, ?)',
        (club_id, user['id'], title, body)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Announcement posted"}), 201