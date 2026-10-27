from flask import Blueprint, jsonify, request
import sqlite3
from database import get_db_connection
from permissions import current_user, club_permissions

clubs_bp = Blueprint('clubs', __name__)

def ensure_club_columns():
    """Self-healing: ensures clubs table has acronym, category, and logo columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    for col, col_type in [('acronym', 'TEXT'), ('category', "TEXT DEFAULT 'Technical'"), ('logo', 'TEXT')]:
        try:
            cursor.execute(f"ALTER TABLE clubs ADD COLUMN {col} {col_type}")
            conn.commit()
        except sqlite3.OperationalError:
            pass # Column already exists
    conn.close()

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