from flask import Blueprint, jsonify, request
import sqlite3
from database import get_db_connection
from permissions import current_user, club_permissions

announcements_bp = Blueprint('announcements', __name__)

def ensure_announcement_columns():
    """Self-healing: ensures announcements table has user_id and visibility columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    for col, col_type in [('user_id', 'INTEGER'), ('visibility', "TEXT DEFAULT 'public'")]:
        try:
            cursor.execute(f"ALTER TABLE announcements ADD COLUMN {col} {col_type}")
            conn.commit()
        except sqlite3.OperationalError:
            pass # Column already exists
    conn.close()

@announcements_bp.route('/api/announcements', methods=['GET'])
def get_all_announcements():
    ensure_announcement_columns()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.*, c.name as club_name, u.name as author_name, u.role as author_global_role
        FROM announcements a
        LEFT JOIN clubs c ON a.club_id = c.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.visibility = 'public'
        ORDER BY a.created_at DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows]), 200

@announcements_bp.route('/api/clubs/<int:club_id>/announcements', methods=['GET'])
def get_club_announcements(club_id):
    ensure_announcement_columns()
    user = current_user()
    perms = club_permissions(user, club_id) if user else {'can_manage': False, 'club_role': None}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if perms['can_manage'] or perms['club_role'] or (user and user['role'] == 'admin'):
        cursor.execute('''
            SELECT a.*, u.name as author_name, cm.role_in_club as author_club_role
            FROM announcements a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN club_members cm ON cm.user_id = u.id AND cm.club_id = a.club_id
            WHERE a.club_id = ?
            ORDER BY a.created_at DESC
        ''', (club_id,))
    else:
        cursor.execute('''
            SELECT a.*, u.name as author_name, cm.role_in_club as author_club_role
            FROM announcements a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN club_members cm ON cm.user_id = u.id AND cm.club_id = a.club_id
            WHERE a.club_id = ? AND a.visibility = 'public'
            ORDER BY a.created_at DESC
        ''', (club_id,))
        
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows]), 200

@announcements_bp.route('/api/clubs/<int:club_id>/announcements', methods=['POST'])
def post_club_announcement(club_id):
    ensure_announcement_columns()
    user = current_user()
    if not user:
        return jsonify({"message": "Please log in first."}), 401
        
    perms = club_permissions(user, club_id)
    if not perms['can_manage'] and user['role'] != 'admin':
        return jsonify({"message": "You don't have permission to post announcements for this club."}), 403
        
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    visibility = data.get('visibility', 'public')
    
    if not title or not content:
        return jsonify({"message": "Title and content are required."}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO announcements (club_id, user_id, title, content, visibility)
        VALUES (?, ?, ?, ?, ?)
    ''', (club_id, user['id'], title, content, visibility))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success", "message": "Announcement posted successfully!"}), 201