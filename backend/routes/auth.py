from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from database import get_db_connection
from permissions import make_token, current_user

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE lower(email) = ?', (email,)).fetchone()
    finally:
        conn.close()

    # Passwords are stored hashed, so compare with check_password_hash (never in SQL)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "status": "success",
        "message": "Login successful",
        "token": make_token(user['id']),
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role']
        }
    }), 200


@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    student_id = (data.get('student_id') or '').strip()
    year_level = (data.get('year_level') or '1st Year').strip()
    course = (data.get('course') or 'BS Information Technology').strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    conn = get_db_connection()
    try:
        existing = conn.execute('SELECT id FROM users WHERE lower(email) = ?', (email,)).fetchone()
        if existing:
            return jsonify({"error": "Email is already registered"}), 400

        hashed_password = generate_password_hash(password)
        
        # New accounts default strictly to 'student' role
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (name, email, password, role, student_id, year_level, course)
            VALUES (?, ?, ?, 'student', ?, ?, ?)
        ''', (name, email, hashed_password, student_id, year_level, course))
        conn.commit()
    finally:
        conn.close()

    return jsonify({"status": "success", "message": "Account created successfully! You can now sign in."}), 201


@auth_bp.route('/api/me', methods=['GET'])
def me():
    """Lets the frontend check that its saved token is still valid."""
    user = current_user()
    if not user:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify({"user": user}), 200