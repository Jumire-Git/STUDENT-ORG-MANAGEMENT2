from flask import Blueprint, jsonify, request
import sqlite3
from database import get_db_connection
from permissions import current_user, club_permissions

clubs_bp = Blueprint('clubs', __name__)

def ensure_club_columns():
    """Self-healing: ensures clubs table has acronym, category, logo, and status columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    for col, col_type in [
        ('acronym', 'TEXT'), 
        ('category', "TEXT DEFAULT 'Technical'"), 
        ('logo', 'TEXT'),
        ('status', "TEXT DEFAULT 'Active'")
    ]:
        try:
            cursor.execute(f"ALTER TABLE clubs ADD COLUMN {col} {col_type}")
            conn.commit()
        except sqlite3.OperationalError:
            pass # Column already exists
    conn.close()

@clubs_bp.route('/api/clubs', methods=['GET'])
def get_clubs():
    ensure_club_columns()
    conn = get_db_connection()
    try:
        clubs = conn.execute('''
            SELECT c.id, c.name, c.description, c.contact_email, c.status, c.category, c.logo,
                   (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.id) as members_count,
                   (SELECT COUNT(*) FROM events e WHERE e.venue = c.name OR e.title LIKE '%' || c.name || '%' OR e.description LIKE '%' || c.name || '%') as events_count
            FROM clubs c
        ''').fetchall()
        
        clubs_list = [
            {
                "id": c["id"],
                "name": c["name"],
                "description": c["description"],
                "email": c["contact_email"],
                "category": c["category"] or "Technical",
                "logo": c["logo"] or "CS",
                "members": c["members_count"] or 0,
                "events": c["events_count"] or 0,
                "status": c["status"] if ("status" in c.keys() and c["status"]) else "Active"
            }
            for c in clubs
        ]
    finally:
        conn.close()
    return jsonify(clubs_list), 200

@clubs_bp.route('/api/clubs', methods=['POST'])
def create_club():
    """Allows Admin to create a new club."""
    ensure_club_columns()
    user = current_user()
    if not user or user['role'] != 'admin':
        return jsonify({"message": "Only admins can create clubs."}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    acronym = (data.get('acronym') or '').strip() or name[:4].upper()
    category = (data.get('category') or 'Technical').strip()
    description = (data.get('description') or '').strip()
    contact_email = (data.get('contact_email') or '').strip()
    logo = (data.get('logo') or acronym[:2]).strip()

    if not name:
        return jsonify({"message": "Club name is required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO clubs (name, acronym, category, description, contact_email, logo)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, acronym, category, description, contact_email, logo))
    club_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Club created successfully!", "id": club_id}), 201

@clubs_bp.route('/api/clubs/<int:club_id>', methods=['PATCH'])
def update_club(club_id):
    """Allows Admin or Club Manager (President) to update club details."""
    ensure_club_columns()
    user = current_user()
    if not user:
        return jsonify({"message": "Please log in first."}), 401

    perms = club_permissions(user, club_id)
    if not perms['can_manage'] and user['role'] != 'admin':
        return jsonify({"message": "You don't have permission to edit this club."}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    acronym = (data.get('acronym') or '').strip()
    category = (data.get('category') or '').strip()
    description = (data.get('description') or '').strip()
    logo = (data.get('logo') or '').strip()

    conn = get_db_connection()
    cursor = conn.cursor()
    
    current = cursor.execute('SELECT * FROM clubs WHERE id = ?', (club_id,)).fetchone()
    if not current:
        conn.close()
        return jsonify({"error": "Club not found"}), 404

    up_name = name or current['name']
    up_acronym = acronym or current['acronym'] or up_name[:4].upper()
    up_category = category or current['category'] or 'Technical'
    up_description = description if description is not None else current['description']
    up_logo = logo or current['logo'] or up_acronym[:2]

    cursor.execute('''
        UPDATE clubs
        SET name = ?, acronym = ?, category = ?, description = ?, logo = ?
        WHERE id = ?
    ''', (up_name, up_acronym, up_category, up_description, up_logo, club_id))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Club updated successfully!"}), 200

@clubs_bp.route('/api/clubs/<int:club_id>', methods=['DELETE'])
def delete_club(club_id):
    """Allows Admin to delete a club."""
    user = current_user()
    if not user or user['role'] != 'admin':
        return jsonify({"message": "Only admins can delete clubs."}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM club_members WHERE club_id = ?', (club_id,))
    cursor.execute('DELETE FROM announcements WHERE club_id = ?', (club_id,))
    cursor.execute('DELETE FROM clubs WHERE id = ?', (club_id,))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Club deleted successfully!"}), 200


# ── Announcement Endpoints ────────────────────────────────────

@clubs_bp.route('/api/announcements', methods=['GET'])
def get_all_announcements():
    """Returns all public announcements for directory and dashboard feeds."""
    conn = get_db_connection()
    try:
        rows = conn.execute('''
            SELECT a.id, a.title, a.content, a.visibility, a.created_at,
                   u.name as author_name, u.role as author_global_role,
                   c.name as club_name
            FROM announcements a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN clubs c ON a.club_id = c.id
            ORDER BY a.created_at DESC
        ''').fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()

@clubs_bp.route('/api/clubs/<int:club_id>/announcements', methods=['GET'])
def get_club_announcements(club_id):
    """Returns announcements specific to a club profile page."""
    conn = get_db_connection()
    try:
        rows = conn.execute('''
            SELECT a.id, a.title, a.content, a.visibility, a.created_at,
                   u.name as author_name, u.role as author_global_role,
                   c.name as club_name
            FROM announcements a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN clubs c ON a.club_id = c.id
            WHERE a.club_id = ?
            ORDER BY a.created_at DESC
        ''', (club_id,)).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()

@clubs_bp.route('/api/clubs/<int:club_id>/announcements', methods=['POST'])
def create_club_announcement(club_id):
    """Allows officers/admins to post announcements for a club."""
    user = current_user()
    if not user:
        return jsonify({"message": "Please log in first."}), 401

    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    visibility = (data.get('visibility') or 'members_only').strip()

    if not title or not content:
        return jsonify({"message": "Title and content are required."}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO announcements (club_id, user_id, title, content, visibility)
            VALUES (?, ?, ?, ?, ?)
        ''', (club_id, user['id'], title, content, visibility))
        conn.commit()
        ann_id = cursor.lastrowid
    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        conn.close()

    return jsonify({"status": "success", "message": "Announcement posted successfully!", "id": ann_id}), 201


# ── Club-Specific Events Endpoint (Single Definition) ──────────

@clubs_bp.route('/api/clubs/<int:club_id>/events', methods=['GET'])
def get_club_specific_events(club_id):
    """Returns dynamic events organized by or linked to a specific club."""
    conn = get_db_connection()
    try:
        club = conn.execute('SELECT name, acronym FROM clubs WHERE id = ?', (club_id,)).fetchone()
        if not club:
            return jsonify({"error": "Club not found"}), 404
        
        club_name = club['name']
        club_acronym = club['acronym']

        rows = conn.execute('''
            SELECT e.id, e.title as name, e.description, e.start_time, e.venue, e.club_id,
                   (SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.id) as registered
            FROM events e
            WHERE (e.club_id = ?) OR (e.venue = ?) OR (e.description LIKE '%' || ? || '%' OR e.description LIKE '%' || ? || '%') OR (e.title LIKE '%' || ? || '%')
            ORDER BY e.id DESC
        ''', (club_id, club_name, club_name, club_acronym, club_name)).fetchall()

        events_list = [{
            "id": r["id"],
            "name": r["name"],
            "date": r["start_time"] or "Nov 3, 2026",
            "venue": r["venue"] or "Auditorium A",
            "registered": f"{r['registered'] or 0} / 200",
            "status": "Upcoming"
        } for r in rows]
        
        return jsonify(events_list), 200
    finally:
        conn.close()