from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash
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


@auth_bp.route('/api/me', methods=['GET'])
def me():
    """Lets the frontend check that its saved token is still valid."""
    user = current_user()
    if not user:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify({"user": user}), 200
