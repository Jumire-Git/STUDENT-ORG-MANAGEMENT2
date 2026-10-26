import sqlite3
import secrets
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash
from database import get_db_connection

members_bp = Blueprint('members', __name__)

YEAR_LEVELS = {'1st Year', '2nd Year', '3rd Year', '4th Year'}


def err(message, status):
    return jsonify({"message": message}), status


@members_bp.route('/api/clubs/<int:club_id>/members', methods=['GET'])
def get_club_members(club_id):
    conn = get_db_connection()
    try:
        rows = conn.execute('''
            SELECT u.id, u.name, u.email, u.student_id, u.year_level, u.course,
                   cm.role_in_club, cm.joined_at
            FROM club_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.club_id = ?
            ORDER BY u.name
        ''', (club_id,)).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        conn.close()


@members_bp.route('/api/clubs/<int:club_id>/members', methods=['POST'])
def add_member(club_id):
    # TODO(auth): only admin or an officer of THIS club may continue
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    student_id = (data.get('student_id') or '').strip() or None
    year_level = data.get('year_level')
    course = (data.get('course') or '').strip() or None

    if not name or not email or '@' not in email:
        return err('A full name and a valid email are required.', 400)
    if year_level not in YEAR_LEVELS:
        return err('Invalid year level.', 400)

    conn = get_db_connection()
    try:
        if not conn.execute('SELECT 1 FROM clubs WHERE id = ?', (club_id,)).fetchone():
            return err('Club not found.', 404)

        try:
            with conn:  # one transaction: commits on success, rolls back on error
                user = conn.execute(
                    'SELECT id FROM users WHERE lower(email) = ?', (email,)
                ).fetchone()

                if user:
                    user_id = user['id']
                    # Only fill in blanks; never overwrite an existing account's data
                    conn.execute('''
                        UPDATE users
                        SET student_id = COALESCE(student_id, ?),
                            year_level = COALESCE(year_level, ?),
                            course     = COALESCE(course, ?)
                        WHERE id = ?
                    ''', (student_id, year_level, course, user_id))
                else:
                    # Role is set by the server, never taken from the request.
                    # Password is a random unusable hash: roster record, no login.
                    cur = conn.execute('''
                        INSERT INTO users (name, email, password, role, student_id, year_level, course)
                        VALUES (?, ?, ?, 'student', ?, ?, ?)
                    ''', (name, email, generate_password_hash(secrets.token_urlsafe(32)),
                          student_id, year_level, course))
                    user_id = cur.lastrowid

                conn.execute(
                    "INSERT INTO club_members (club_id, user_id, role_in_club) VALUES (?, ?, 'Member')",
                    (club_id, user_id))
        except sqlite3.IntegrityError:
            return err('That student is already a member of this club.', 409)

        return jsonify({"message": "Member added successfully!", "user_id": user_id}), 201
    except Exception as e:
        print("ERROR adding member:", e)
        return err('Server error while adding member.', 500)
    finally:
        conn.close()


@members_bp.route('/api/clubs/<int:club_id>/members/<int:user_id>', methods=['PATCH'])
def update_member(club_id, user_id):
    # TODO(auth): only admin or an officer of THIS club may continue
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    try:
        if not conn.execute('SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?',
                            (club_id, user_id)).fetchone():
            return err('Member not found in this club.', 404)

        fields = {}  # keys below are a fixed whitelist, so the f-string is safe
        if 'name' in data:
            name = (data['name'] or '').strip()
            if not name:
                return err('Name cannot be empty.', 400)
            fields['name'] = name
        if 'student_id' in data:
            fields['student_id'] = (data['student_id'] or '').strip() or None
        if 'year_level' in data:
            if data['year_level'] not in YEAR_LEVELS:
                return err('Invalid year level.', 400)
            fields['year_level'] = data['year_level']
        if 'course' in data:
            fields['course'] = (data['course'] or '').strip() or None

        with conn:
            if fields:
                sets = ', '.join(f'{k} = ?' for k in fields)
                conn.execute(f'UPDATE users SET {sets} WHERE id = ?', (*fields.values(), user_id))
            if 'role_in_club' in data:
                role = ((data['role_in_club'] or '').strip() or 'Member')[:50]
                conn.execute('UPDATE club_members SET role_in_club = ? WHERE club_id = ? AND user_id = ?',
                             (role, club_id, user_id))

        return jsonify({"message": "Member updated."})
    except Exception as e:
        print("ERROR updating member:", e)
        return err('Server error while updating member.', 500)
    finally:
        conn.close()


@members_bp.route('/api/clubs/<int:club_id>/members/<int:user_id>', methods=['DELETE'])
def remove_member(club_id, user_id):
    # TODO(auth): only admin or an officer of THIS club may continue
    conn = get_db_connection()
    try:
        with conn:
            cur = conn.execute('DELETE FROM club_members WHERE club_id = ? AND user_id = ?',
                               (club_id, user_id))
        if cur.rowcount == 0:
            return err('Member not found in this club.', 404)
        return jsonify({"message": "Member removed."})  # the user record is kept
    finally:
        conn.close()